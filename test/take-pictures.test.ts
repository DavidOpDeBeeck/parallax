import { deepStrictEqual, equal, notDeepStrictEqual } from "node:assert/strict"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { test } from "node:test"

import { PNG } from "pngjs"
import { pageDocument } from "../src/pages.ts"
import { takePictures } from "../src/pictures.ts"
import { withTemporaryFolder } from "../src/temporary-folder.ts"

const page = pageDocument({
  title: "API",
  html: `<style>
body { margin: 0; background: white; }
@media (prefers-color-scheme: dark) { body { background: black; } }
.tall { height: 1200px; }
</style><div class="tall"></div>`,
})

async function readPng(file: string): Promise<PNG> {
  return PNG.sync.read(await readFile(file))
}

test("a page is pictured light and dark, as wide as a page is given and as tall as it grows", async () => {
  await withTemporaryFolder(async (folder) => {
    await writeFile(join(folder, "api.html"), page)

    const taken = await takePictures(folder, ["api.html"])

    deepStrictEqual(taken, ["api-light.png", "api-dark.png"])
    const light = await readPng(join(folder, "api-light.png"))
    equal(light.width, 880)
    equal(light.height, 1200)
  })
})

test("the dark picture is of the page in its dark scheme", async () => {
  await withTemporaryFolder(async (folder) => {
    await writeFile(join(folder, "api.html"), page)

    await takePictures(folder, ["api.html"])

    const light = await readPng(join(folder, "api-light.png"))
    const dark = await readPng(join(folder, "api-dark.png"))
    notDeepStrictEqual([...light.data.subarray(0, 4)], [...dark.data.subarray(0, 4)])
  })
})
