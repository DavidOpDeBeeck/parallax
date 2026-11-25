import { mkdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { buildCanvas } from "./canvas/canvas.ts"
import type { Change } from "./change.ts"
import { changeSetFile, changeSetOf } from "./change-set.ts"
import { shortCommit } from "./git.ts"
import { pageDocument, pagesOf } from "./pages.ts"
import type { ExtensionResult } from "./run.ts"

export type Written = { pages: string[]; canvas: string; changeSet: string }

export function changeFolder(change: Change): string {
  return join(change.repository, ".parallax", `${shortCommit(change.base)}-${shortCommit(change.head)}`)
}

export async function writeChange(change: Change, results: ExtensionResult[]): Promise<Written> {
  const folder = changeFolder(change)
  const pages = pagesOf(results)
  const written = {
    pages: pages.map(({ fileName }) => join(folder, fileName)),
    canvas: join(folder, "canvas.html"),
    changeSet: join(folder, changeSetFile),
  }

  try {
    await rm(folder, { recursive: true, force: true })
    await mkdir(folder, { recursive: true })
    for (const page of pages) await writeFile(join(folder, page.fileName), pageDocument(page.view))
    await writeFile(written.canvas, buildCanvas(change, results))
    await writeFile(written.changeSet, `${JSON.stringify(changeSetOf(change, results), null, 2)}\n`)
  } catch (cause) {
    throw new Error(`writing into ${folder} failed`, { cause })
  }
  return written
}
