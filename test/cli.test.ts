import { deepStrictEqual, ok, rejects } from "node:assert/strict"
import { readdir } from "node:fs/promises"
import { join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { readChangeSet } from "../src/change-set.ts"
import { runGit } from "../src/git.ts"
import { runProcess } from "../src/process.ts"
import { withTemporaryFolder } from "../src/temporary-folder.ts"
import { commitFiles, initRepository } from "./repository.ts"

const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url))

const config = `import { readFile } from "node:fs/promises"
import { join } from "node:path"

function file(name: string, path: string) {
  return {
    name,
    extract: (checkout: string) => readFile(join(checkout, path), "utf8"),
    compare: (base: string, head: string) => (base === head ? undefined : { path }),
    show: (delta: { path: string }) => [{ title: name, html: \`<p>\${delta.path}</p>\` }],
  }
}

export default { extensions: [file("notes", "notes.txt"), file("todo", "todo.txt")] }
`

async function changedRepository(folder: string): Promise<void> {
  await initRepository(folder)
  await commitFiles(folder, { "notes.txt": "1", "todo.txt": "1", "parallax.config.ts": config }, "start")
  await runGit(folder, ["switch", "--create", "feature"])
  await commitFiles(folder, { "notes.txt": "2", "todo.txt": "2" }, "change both")
}

test("parallax writes the change of the checked-out branch into .parallax, a page per view and the canvas", async () => {
  await withTemporaryFolder(async (folder) => {
    await changedRepository(folder)

    const printed = await runProcess("node", [cli], { cwd: folder })

    const [changeFolder] = await readdir(join(folder, ".parallax"))
    const written = await readdir(join(folder, ".parallax", changeFolder!))
    deepStrictEqual(written.sort(), ["canvas.html", "change.json", "notes.html", "todo.html"])
    ok(printed.includes("notes.html") && printed.includes("canvas.html"))
  })
})

test("a change with nothing in it writes nothing, and says so", async () => {
  await withTemporaryFolder(async (folder) => {
    await changedRepository(folder)

    const printed = await runProcess("node", [cli, "--head", "main"], { cwd: folder })

    deepStrictEqual(printed, "no change\n")
  })
})

test("a mistake in how parallax is called fails before anything runs", async () => {
  await withTemporaryFolder(async (folder) => {
    await changedRepository(folder)

    const run = runProcess("node", [cli, "--bsae", "main"], { cwd: folder })

    await rejects(run, (error: Error) => error.message.includes("Unknown option '--bsae'"))
  })
})

test("the change set holds both commits and every extension's views, in the config's order", async () => {
  await withTemporaryFolder(async (folder) => {
    await changedRepository(folder)

    await runProcess("node", [cli], { cwd: folder })

    const [changeFolder] = await readdir(join(folder, ".parallax"))
    const changeSet = await readChangeSet(join(folder, ".parallax", changeFolder!, "change.json"))
    deepStrictEqual(
      changeSet.extensions.map(({ name, views }) => [name, views]),
      [
        ["notes", [{ title: "notes", page: "notes.html" }]],
        ["todo", [{ title: "todo", page: "todo.html" }]],
      ],
    )
  })
})

test("the installed command runs parallax", async () => {
  const installed = fileURLToPath(new URL("../bin/parallax.js", import.meta.url))

  const printed = await runProcess("node", [installed, "--help"], { cwd: "." })

  ok(printed.startsWith("usage: parallax"))
})
