import { fieldOf } from "../json-field.ts"

export type GitHub = {
  api: string
  token: string
  fetch?: typeof fetch
}

export type KeepCommentOptions = {
  body: string
  create: boolean
}

type Body = { json: object } | { bytes: Buffer; type: string }

type Answer = { request: string; json: unknown }

// The first line of parallax's comment, which finds it again; a reply that quotes it starts with ">", so never does.
export const commentMarker = "<!-- parallax -->"

const commentsPerPage = 100

export async function keepComment(
  github: GitHub,
  repository: string,
  pullRequest: number,
  { body, create }: KeepCommentOptions,
): Promise<string | undefined> {
  const json = { body: `${commentMarker}\n${body}` }
  const existing = await findComment(github, repository, pullRequest)

  if (existing !== undefined) {
    const updated = await callGitHub(github, "PATCH", `/repos/${repository}/issues/comments/${existing}`, { json })
    return textIn(updated, "html_url")
  }
  if (!create) return undefined

  const added = await callGitHub(github, "POST", `/repos/${repository}/issues/${pullRequest}/comments`, { json })
  return textIn(added, "html_url")
}

// GitHub doesn't document this endpoint, and a workflow's own token can't use it: it needs a person's, or a bot
// account's, that can push to the repository. Without push access it answers 404.
export async function attachFile(
  github: GitHub,
  repositoryId: number,
  name: string,
  bytes: Buffer,
  type: string,
): Promise<string> {
  const uploads = github.api
    .replace(/^https:\/\/api\.github\.com$/, "https://uploads.github.com")
    .replace(/\/api\/v3$/, "/api/uploads")
  const query = new URLSearchParams({ name, content_type: type, repository_id: String(repositoryId) })

  const attached = await callGitHub(github, "POST", `${uploads}/user-attachments/assets?${query}`, { bytes, type })
  return textIn(attached, "url")
}

export async function repositoryIdOf(github: GitHub, repository: string): Promise<number> {
  return numberIn(await callGitHub(github, "GET", `/repos/${repository}`), "id")
}

async function findComment(github: GitHub, repository: string, pullRequest: number): Promise<number | undefined> {
  for (let page = 1; ; page++) {
    const path = `/repos/${repository}/issues/${pullRequest}/comments?per_page=${commentsPerPage}&page=${page}`
    const answer = await callGitHub(github, "GET", path)
    const comments = listIn(answer)
    const ours = comments.find((comment) => isOurs(fieldOf(comment, "body")))
    if (ours !== undefined) return numberIn({ ...answer, json: ours }, "id")
    if (comments.length < commentsPerPage) return undefined
  }
}

function isOurs(body: unknown): boolean {
  return typeof body === "string" && body.startsWith(commentMarker)
}

async function callGitHub(
  { api, token, fetch: send = fetch }: GitHub,
  method: string,
  path: string,
  body?: Body,
): Promise<Answer> {
  const url = /^https?:\/\//.test(path) ? path : `${api}${path}`
  const request = `${method} ${url.replace(/\?.*/, "")}`
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "parallax",
  }
  if (body !== undefined) headers["content-type"] = "json" in body ? "application/json" : body.type
  const payload = payloadOf(body)
  const init: RequestInit = payload === undefined ? { method, headers } : { method, headers, body: payload }

  const { ok, status, text } = await fetchText(send, url, init, request)
  if (!ok) throw new Error(`GitHub answered ${request} with ${status}${reasonIn(text)}`)

  try {
    return { request, json: JSON.parse(text) }
  } catch (cause) {
    throw new Error(`GitHub answered ${request} with something that is not JSON`, { cause })
  }
}

async function fetchText(
  send: typeof fetch,
  url: string,
  init: RequestInit,
  request: string,
): Promise<{ ok: boolean; status: number; text: string }> {
  try {
    const response = await send(url, init)
    return { ok: response.ok, status: response.status, text: await response.text() }
  } catch (cause) {
    throw new Error(`calling GitHub ${request} failed`, { cause })
  }
}

function payloadOf(body: Body | undefined): BodyInit | undefined {
  if (body === undefined) return undefined
  if ("json" in body) return JSON.stringify(body.json)
  return new Uint8Array(body.bytes)
}

// GitHub says why it refused in the answer's `message`.
function reasonIn(text: string): string {
  try {
    const message = fieldOf(JSON.parse(text), "message")
    return typeof message === "string" ? `: ${message}` : ""
  } catch {
    // A refusal that isn't JSON, such as a proxy's page, gives no reason to add: its status is still said.
    return ""
  }
}

function textIn({ request, json }: Answer, name: string): string {
  const value = fieldOf(json, name)
  if (typeof value !== "string") throw unexpectedAnswer(request, `text in \`${name}\``, value)
  return value
}

function numberIn({ request, json }: Answer, name: string): number {
  const value = fieldOf(json, name)
  if (typeof value !== "number") throw unexpectedAnswer(request, `a number in \`${name}\``, value)
  return value
}

function listIn({ request, json }: Answer): unknown[] {
  if (!Array.isArray(json)) throw unexpectedAnswer(request, "a list", json)
  return json
}

function unexpectedAnswer(request: string, expected: string, found: unknown): Error {
  return new Error(`GitHub answered ${request} without ${expected}; got ${describeJson(found)}`)
}

function describeJson(value: unknown): string {
  if (value === undefined) return "nothing"
  if (Array.isArray(value)) return "a list"
  if (typeof value === "object" && value !== null) return "an object"
  return JSON.stringify(value)
}
