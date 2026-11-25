import { readFile } from "node:fs/promises"

import { fieldOf } from "../json-field.ts"

export async function readPullRequestNumber(eventFile: string | undefined): Promise<number | undefined> {
  if (eventFile === undefined) return undefined

  try {
    return pullRequestNumberOf(JSON.parse(await readFile(eventFile, "utf8")))
  } catch (cause) {
    throw new Error(`reading the workflow's event ${eventFile} failed`, { cause })
  }
}

export function pullRequestNumberOf(event: unknown): number | undefined {
  const pullRequest = fieldOf(event, "pull_request")
  if (pullRequest === undefined) return undefined

  const number = fieldOf(pullRequest, "number")
  if (typeof number !== "number") {
    throw new Error(`a pull request event must have a number; got ${JSON.stringify(number)}`)
  }
  return number
}
