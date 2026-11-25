import { existsSync } from "node:fs"
import { join } from "node:path"
import { parseArgs } from "node:util"

import { type Change, type ChangeRefs, findChange } from "../change.ts"
import { type ChangeSet, changeSetFile, readChangeSet } from "../change-set.ts"
import { changeFolder } from "../output.ts"

export type WrittenChange = { change: Change; folder: string; changeSet: ChangeSet | undefined }

export function parseChangeRefs(args: string[]): ChangeRefs {
  const { values } = parseArgs({
    args,
    options: { base: { type: "string" }, head: { type: "string" } },
    strict: true,
    allowPositionals: false,
  })
  const { base, head } = values
  if (base === undefined || head === undefined) {
    throw new Error(`the action's steps need both --base and --head; got ${JSON.stringify({ base, head })}`)
  }
  return { base, head }
}

export async function readWrittenChange(refs: ChangeRefs): Promise<WrittenChange> {
  const change = await findChange(process.cwd(), refs)
  const folder = changeFolder(change)
  const changeSetPath = join(folder, changeSetFile)
  const changeSet = existsSync(changeSetPath) ? await readChangeSet(changeSetPath) : undefined
  return { change, folder, changeSet }
}
