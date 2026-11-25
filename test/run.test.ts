import { deepStrictEqual, equal, ok, rejects } from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { test } from "node:test"
import type { CommitsExtension, SnapshotExtension } from "../src/api.ts"
import { type Change, findChange } from "../src/change.ts"
import { runGit } from "../src/git.ts"
import { runChange } from "../src/run.ts"
import { withTemporaryFolder } from "../src/temporary-folder.ts"
import { commitFiles, initRepository } from "./repository.ts"

function fileExtension(name: string, path: string): SnapshotExtension<string, { path: string }> {
  return {
    name,
    extract: (checkout) => readFile(join(checkout, path), "utf8"),
    compare: (base, head) => (base === head ? undefined : { path }),
    show: (delta) => [{ title: "Files", html: `<p>${delta.path}</p>` }],
  }
}

async function changedRepository(folder: string): Promise<Change> {
  await initRepository(folder)
  await commitFiles(folder, { "a.txt": "1", "b.txt": "1" }, "start")
  await runGit(folder, ["switch", "--create", "feature"])
  await commitFiles(folder, { "a.txt": "2" }, "change a")
  return findChange(folder, { base: "main", head: "feature" })
}

test("a run reads both commits with each extension, in the config's order", async () => {
  await withTemporaryFolder(async (folder) => {
    const change = await changedRepository(folder)
    const extensions = [fileExtension("b", "b.txt"), fileExtension("a", "a.txt")]

    const results = await runChange(change, { extensions })

    deepStrictEqual(
      results.map(({ name, views }) => [name, views.length]),
      [
        ["b", 0],
        ["a", 1],
      ],
    )
  })
})

test("an extension that fails fails the run, naming itself and the commit it was reading", async () => {
  await withTemporaryFolder(async (folder) => {
    const change = await changedRepository(folder)
    const extensions = [fileExtension("missing", "missing.txt")]

    const run = runChange(change, { extensions })

    await rejects(run, { message: `missing failed reading ${change.base.slice(0, 12)}` })
  })
})

test("a run leaves no checkouts behind, even when it fails", async () => {
  await withTemporaryFolder(async (folder) => {
    const change = await changedRepository(folder)
    const extensions = [fileExtension("a", "a.txt"), fileExtension("missing", "missing.txt")]

    await rejects(runChange(change, { extensions }))

    const worktrees = await runGit(folder, ["worktree", "list", "--porcelain"])
    equal(worktrees.split("\n").filter((line) => line.startsWith("worktree ")).length, 1)
  })
})

test("progress is told a line per step, under the extension's name", async () => {
  await withTemporaryFolder(async (folder) => {
    const change = await changedRepository(folder)
    const lines: string[] = []

    await runChange(change, { extensions: [fileExtension("a", "a.txt")] }, { onProgress: (line) => lines.push(line) })

    equal(lines.length, 3)
    ok(lines.every((line) => line.startsWith("a: ")))
  })
})

function checkoutCounter(seen: number[]): CommitsExtension<null> {
  return {
    name: "counter",
    compareCommits: async (change) => {
      const worktrees = await runGit(change.repository, ["worktree", "list", "--porcelain"])
      seen.push(worktrees.split("\n").filter((line) => line.startsWith("worktree ")).length)
      return undefined
    },
    show: () => [],
  }
}

test("an extension that needs both commits at once is given the change", async () => {
  await withTemporaryFolder(async (folder) => {
    const change = await changedRepository(folder)
    const given: Change[] = []
    const extension: CommitsExtension<null> = {
      name: "commits",
      compareCommits: async (commits) => {
        given.push(commits)
        return undefined
      },
      show: () => [],
    }

    await runChange(change, { extensions: [extension] })

    deepStrictEqual(given, [change])
  })
})

test("nothing is checked out when no extension reads a commit on its own", async () => {
  await withTemporaryFolder(async (folder) => {
    const change = await changedRepository(folder)
    const seen: number[] = []

    await runChange(change, { extensions: [checkoutCounter(seen)] })

    deepStrictEqual(seen, [1])
  })
})

test("an extension's own delta is kept, with the views it shows it as", async () => {
  await withTemporaryFolder(async (folder) => {
    const change = await changedRepository(folder)

    const [result] = await runChange(change, { extensions: [fileExtension("shown", "a.txt")] })

    deepStrictEqual(result, {
      name: "shown",
      delta: { path: "a.txt" },
      views: [{ title: "Files", html: "<p>a.txt</p>" }],
    })
  })
})

test("an extension that finds no change shows nothing", async () => {
  await withTemporaryFolder(async (folder) => {
    const change = await changedRepository(folder)

    const [result] = await runChange(change, { extensions: [fileExtension("shown", "b.txt")] })

    deepStrictEqual(result, { name: "shown", views: [] })
  })
})
