import { deepStrictEqual, equal, rejects } from "node:assert/strict"
import { test } from "node:test"

import { findChange, hasUncommittedWork } from "../src/change.ts"
import { runGit } from "../src/git.ts"
import { withTemporaryFolder } from "../src/temporary-folder.ts"
import { commitFiles, initRepository, writeFiles } from "./repository.ts"

test("the base is where the head's branch left the base ref, not what the ref did since", async () => {
  await withTemporaryFolder(async (folder) => {
    await initRepository(folder)
    const branchPoint = await commitFiles(folder, { "a.txt": "1" }, "start")
    await runGit(folder, ["switch", "--create", "feature"])
    const head = await commitFiles(folder, { "a.txt": "2" }, "on the branch")
    await runGit(folder, ["switch", "main"])
    await commitFiles(folder, { "b.txt": "1" }, "on main meanwhile")

    const change = await findChange(folder, { base: "main", head: "feature" })

    deepStrictEqual([change.base, change.head], [branchPoint, head])
  })
})

test("a commit on the base ref itself is a change from itself to itself", async () => {
  await withTemporaryFolder(async (folder) => {
    await initRepository(folder)
    const commit = await commitFiles(folder, { "a.txt": "1" }, "start")

    const change = await findChange(folder, { base: "main", head: "HEAD" })

    deepStrictEqual([change.base, change.head], [commit, commit])
  })
})

test("a head with no history in common with the base ref fails, saying so", async () => {
  await withTemporaryFolder(async (folder) => {
    await initRepository(folder)
    await commitFiles(folder, { "a.txt": "1" }, "start")
    await runGit(folder, ["switch", "--orphan", "unrelated"])
    await commitFiles(folder, { "b.txt": "1" }, "another start")

    const find = findChange(folder, { base: "main", head: "unrelated" })

    await rejects(find, {
      message: "unrelated has no history in common with main, so there is no base to compare it with",
    })
  })
})

test("a ref that is not a commit fails, naming it", async () => {
  await withTemporaryFolder(async (folder) => {
    await initRepository(folder)
    await commitFiles(folder, { "a.txt": "1" }, "start")

    const find = findChange(folder, { base: "mian", head: "HEAD" })

    await rejects(find, (error: Error) => error.message.startsWith("mian is not a commit in "))
  })
})

test("uncommitted work is noticed", async () => {
  await withTemporaryFolder(async (folder) => {
    await initRepository(folder)
    await commitFiles(folder, { "a.txt": "1" }, "start")
    await writeFiles(folder, { "a.txt": "2" })

    const uncommitted = await hasUncommittedWork(folder)

    equal(uncommitted, true)
  })
})
