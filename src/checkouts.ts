import { join } from "node:path"

import type { Change } from "./change.ts"
import { runGit } from "./git.ts"
import { withTemporaryFolder } from "./temporary-folder.ts"

export type Checkouts = { base: string; head: string }

export async function withCheckouts<Result>(
  change: Change,
  use: (checkouts: Checkouts) => Promise<Result>,
): Promise<Result> {
  return withTemporaryFolder(async (folder) => {
    const checkouts = { base: join(folder, "base"), head: join(folder, "head") }
    const added: string[] = []

    try {
      for (const side of ["base", "head"] as const) {
        await runGit(change.repository, ["worktree", "add", "--detach", checkouts[side], change[side]])
        added.push(checkouts[side])
      }
      return await use(checkouts)
    } finally {
      for (const checkout of added) {
        await runGit(change.repository, ["worktree", "remove", "--force", checkout])
      }
    }
  })
}
