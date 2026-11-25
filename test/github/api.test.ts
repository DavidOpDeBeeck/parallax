import { deepStrictEqual, equal, rejects } from "node:assert/strict"
import { test } from "node:test"

import { attachFile, commentMarker, type GitHub, keepComment, repositoryIdOf } from "../../src/github/api.ts"

type Call = { method: string; url: string; body: string | undefined }

function fakeGitHub(answers: ({ status?: number; json: unknown } | { text: string })[]): {
  github: GitHub
  calls: Call[]
} {
  const calls: Call[] = []
  const github: GitHub = {
    api: "https://api.github.com",
    token: "token",
    fetch: async (url, init) => {
      calls.push({
        method: init?.method ?? "GET",
        url: String(url),
        body: typeof init?.body === "string" ? init.body : undefined,
      })
      const answer = answers.shift() ?? { json: {} }
      if ("text" in answer) return new Response(answer.text)
      return new Response(JSON.stringify(answer.json), { status: answer.status ?? 200 })
    },
  }
  return { github, calls }
}

test("parallax's comment is updated, not added again", async () => {
  const theirs = { id: 1, body: "Looks good" }
  const ours = { id: 2, body: `${commentMarker}\nold` }
  const { github, calls } = fakeGitHub([{ json: [theirs, ours] }, { json: { html_url: "https://example.test/2" } }])

  const url = await keepComment(github, "owner/repo", 7, { body: "new", create: true })

  equal(url, "https://example.test/2")
  deepStrictEqual(calls[1], {
    method: "PATCH",
    url: "https://api.github.com/repos/owner/repo/issues/comments/2",
    body: JSON.stringify({ body: `${commentMarker}\nnew` }),
  })
})

test("without a comment of its own, parallax adds one", async () => {
  const { github, calls } = fakeGitHub([{ json: [] }, { json: { html_url: "https://example.test/3" } }])

  await keepComment(github, "owner/repo", 7, { body: "new", create: true })

  deepStrictEqual(
    calls.map(({ method, url }) => [method, url]),
    [
      ["GET", "https://api.github.com/repos/owner/repo/issues/7/comments?per_page=100&page=1"],
      ["POST", "https://api.github.com/repos/owner/repo/issues/7/comments"],
    ],
  )
})

test("with nothing to say and no comment yet, nothing is added", async () => {
  const { github, calls } = fakeGitHub([{ json: [] }])

  const url = await keepComment(github, "owner/repo", 7, { body: "No change.", create: false })

  equal(url, undefined)
  equal(calls.length, 1)
})

test("a repository is known by its id", async () => {
  const { github } = fakeGitHub([{ json: { id: 42 } }])

  const id = await repositoryIdOf(github, "owner/repo")

  equal(id, 42)
})

test("a file is attached to the repository by its id, and its address returned", async () => {
  const { github, calls } = fakeGitHub([{ json: { url: "https://example.test/image" } }])

  const url = await attachFile(github, 42, "api-light.svg", Buffer.from("<svg/>"), "image/svg+xml")

  equal(url, "https://example.test/image")
  equal(
    calls[0]?.url,
    "https://uploads.github.com/user-attachments/assets?name=api-light.svg&content_type=image%2Fsvg%2Bxml&repository_id=42",
  )
})

test("a refusal says what GitHub answered", async () => {
  const { github } = fakeGitHub([{ status: 403, json: { message: "Resource not accessible by integration" } }])

  const keep = keepComment(github, "owner/repo", 7, { body: "new", create: true })

  await rejects(keep, {
    message:
      "GitHub answered GET https://api.github.com/repos/owner/repo/issues/7/comments with 403: Resource not accessible by integration",
  })
})

test("an answer without what was asked for fails, saying what GitHub sent", async () => {
  const { github } = fakeGitHub([{ json: [] }, { json: { html_url: 3 } }])

  const keep = keepComment(github, "owner/repo", 7, { body: "new", create: true })

  await rejects(keep, {
    message:
      "GitHub answered POST https://api.github.com/repos/owner/repo/issues/7/comments without text in `html_url`; got 3",
  })
})

test("an answer that is not JSON fails, naming the request", async () => {
  const { github } = fakeGitHub([{ text: "<html>" }])

  const id = repositoryIdOf(github, "owner/repo")

  await rejects(id, {
    message: "GitHub answered GET https://api.github.com/repos/owner/repo with something that is not JSON",
  })
})
