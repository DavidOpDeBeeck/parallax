import { readFile } from "node:fs/promises"
import type { Json } from "./api.ts"
import type { Change } from "./change.ts"
import { pageFileName } from "./pages.ts"
import type { ExtensionResult } from "./run.ts"

export type ChangeSet = { base: string; head: string; extensions: ChangeSetExtension[] }

export type ChangeSetExtension = {
  name: string
  delta?: Json
  views: { title: string; page: string }[]
}

export const changeSetFile = "change.json"

export function changeSetOf(change: Change, results: ExtensionResult[]): ChangeSet {
  const extensions = results.map(({ name, delta, views }): ChangeSetExtension => {
    const listed = views.map(({ title }, index) => ({ title, page: pageFileName(name, index, views.length) }))
    return delta === undefined ? { name, views: listed } : { name, delta, views: listed }
  })
  return { base: change.base, head: change.head, extensions }
}

// A change set parallax wrote is read as it was written, not checked again.
export async function readChangeSet(file: string): Promise<ChangeSet> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as ChangeSet
  } catch (cause) {
    throw new Error(`reading the change set ${file} failed`, { cause })
  }
}
