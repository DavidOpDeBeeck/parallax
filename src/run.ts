import type { CommitsExtension, Config, Extension, Json, SnapshotExtension, View } from "./api.ts"
import type { Change } from "./change.ts"
import { type Checkouts, withCheckouts } from "./checkouts.ts"
import { shortCommit } from "./git.ts"

export type ExtensionResult = {
  name: string
  delta?: Json
  views: View[]
}

type AnyExtension = Extension<Json, Json>

type Progress = (line: string) => void

export type RunOptions = {
  onProgress?: Progress
}

export async function runChange(
  change: Change,
  config: Config,
  { onProgress = () => {} }: RunOptions = {},
): Promise<ExtensionResult[]> {
  const runAll = async (checkouts: Checkouts | undefined) => {
    const results: ExtensionResult[] = []
    for (const extension of config.extensions) {
      results.push(await runExtension(extension, change, checkouts, onProgress))
    }
    return results
  }

  const readsCheckouts = config.extensions.some((extension) => !isCommitsExtension(extension))
  return readsCheckouts ? withCheckouts(change, runAll) : runAll(undefined)
}

function isCommitsExtension(extension: AnyExtension): extension is CommitsExtension<Json> {
  return "compareCommits" in extension
}

async function runExtension(
  extension: AnyExtension,
  change: Change,
  checkouts: Checkouts | undefined,
  onProgress: Progress,
): Promise<ExtensionResult> {
  if (isCommitsExtension(extension)) return runCommitsExtension(extension, change, onProgress)
  // runChange checks both commits out whenever the config has an extension that reads them on their own.
  return runSnapshotExtension(extension, change, checkouts!, onProgress)
}

async function runCommitsExtension(
  extension: CommitsExtension<Json>,
  change: Change,
  onProgress: Progress,
): Promise<ExtensionResult> {
  onProgress(`${extension.name}: comparing ${shortCommit(change.base)} with ${shortCommit(change.head)}`)

  let delta: Json | undefined
  try {
    delta = await extension.compareCommits(change)
  } catch (cause) {
    throw comparingFailed(extension.name, change, cause)
  }
  return show(extension, delta)
}

async function runSnapshotExtension(
  extension: SnapshotExtension<Json, Json>,
  change: Change,
  checkouts: Checkouts,
  onProgress: Progress,
): Promise<ExtensionResult> {
  onProgress(`${extension.name}: reading ${shortCommit(change.base)}`)
  const base = await extract(extension, checkouts.base, change.base)
  onProgress(`${extension.name}: reading ${shortCommit(change.head)}`)
  const head = await extract(extension, checkouts.head, change.head)
  onProgress(`${extension.name}: comparing`)

  let delta: Json | undefined
  try {
    delta = extension.compare(base, head)
  } catch (cause) {
    throw comparingFailed(extension.name, change, cause)
  }
  return show(extension, delta)
}

function show(extension: AnyExtension, delta: Json | undefined): ExtensionResult {
  if (delta === undefined) return { name: extension.name, views: [] }

  try {
    return { name: extension.name, delta, views: extension.show(delta) }
  } catch (cause) {
    throw new Error(`${extension.name} failed showing what changed`, { cause })
  }
}

async function extract(extension: SnapshotExtension<Json, Json>, checkout: string, commit: string): Promise<Json> {
  try {
    return await extension.extract(checkout)
  } catch (cause) {
    throw new Error(`${extension.name} failed reading ${shortCommit(commit)}`, { cause })
  }
}

function comparingFailed(name: string, change: Change, cause: unknown): Error {
  return new Error(`${name} failed comparing ${shortCommit(change.base)} with ${shortCommit(change.head)}`, { cause })
}
