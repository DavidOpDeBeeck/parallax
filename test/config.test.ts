import { deepStrictEqual, equal, rejects } from "node:assert/strict"
import { test } from "node:test"

import { loadConfig } from "../src/config.ts"
import { resolveParallaxImports } from "../src/parallax-imports.ts"
import { withTemporaryFolder } from "../src/temporary-folder.ts"
import { writeFiles } from "./repository.ts"

const importsParallax = 'import * as parallax from "parallax"\n\nexport default { extensions: [], api: parallax }\n'

function importedApi(config: unknown): unknown {
  return (config as { api: unknown }).api
}

test("a config is what parallax.config.ts exports by default", async () => {
  await withTemporaryFolder(async (folder) => {
    await writeFiles(folder, { "parallax.config.ts": "export default { extensions: [] }\n" })

    const config = await loadConfig(folder)

    deepStrictEqual(config, { extensions: [] })
  })
})

test("a config without a default export fails, saying what to export", async () => {
  await withTemporaryFolder(async (folder) => {
    await writeFiles(folder, { "parallax.config.ts": "export const extensions = []\n" })

    const load = loadConfig(folder)

    await rejects(load, {
      message:
        "parallax.config.ts must export its extensions: export default { extensions: [...] }; got no default export",
    })
  })
})

test("two extensions with the same name fail, naming it", async () => {
  await withTemporaryFolder(async (folder) => {
    await writeFiles(folder, {
      "parallax.config.ts": 'export default { extensions: [{ name: "api" }, { name: "api" }] }\n',
    })

    const load = loadConfig(folder)

    await rejects(load, (error: Error) => error.message.startsWith('two extensions are named "api"'))
  })
})

test("an extension named after the canvas fails", async () => {
  await withTemporaryFolder(async (folder) => {
    await writeFiles(folder, { "parallax.config.ts": 'export default { extensions: [{ name: "canvas" }] }\n' })

    const load = loadConfig(folder)

    await rejects(load, (error: Error) => error.message.startsWith(`an extension can't be named "canvas"`))
  })
})

test("a repository without a config fails, saying what to write", async () => {
  await withTemporaryFolder(async (folder) => {
    const load = loadConfig(folder)

    await rejects(
      load,
      (error: Error) =>
        error.message.includes("there is no parallax.config.ts in ") && error.message.includes("export default"),
    )
  })
})

test("a project's config imports the parallax that runs it", async () => {
  await withTemporaryFolder(async (folder) => {
    await writeFiles(folder, { "parallax.config.ts": importsParallax })
    resolveParallaxImports()

    const loaded = await loadConfig(folder)

    equal(importedApi(loaded), await import("../src/api.ts"))
  })
})

test("a project's config is read as a module, even in a package that says CommonJS", async () => {
  await withTemporaryFolder(async (folder) => {
    await writeFiles(folder, { "package.json": '{ "type": "commonjs" }\n', "parallax.config.ts": importsParallax })
    resolveParallaxImports()

    const loaded = await loadConfig(folder)

    equal(importedApi(loaded), await import("../src/api.ts"))
  })
})

test("a project's .tsx is read, its JSX made by the runtime the file names", async () => {
  await withTemporaryFolder(async (folder) => {
    const show = '/** @jsxImportSource tags */\nexport const show = (title: string) => <h1 class="title">{title}</h1>\n'
    const config = 'import { show } from "./show.tsx"\n\nexport default { extensions: [], shown: show("API") }\n'
    const runtime = "export const jsx = (type, props) => ({ type, props })\nexport const jsxs = jsx\n"
    const runtimePackage = { name: "tags", type: "module", exports: { "./jsx-runtime": "./jsx-runtime.js" } }
    await writeFiles(folder, {
      "parallax.config.ts": config,
      "show.tsx": show,
      "node_modules/tags/package.json": JSON.stringify(runtimePackage),
      "node_modules/tags/jsx-runtime.js": runtime,
    })
    resolveParallaxImports()

    const loaded = await loadConfig(folder)

    deepStrictEqual((loaded as unknown as { shown: unknown }).shown, {
      type: "h1",
      props: { class: "title", children: "API" },
    })
  })
})
