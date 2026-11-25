import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { PNG } from "pngjs"

import { runProcess } from "../tools/run-process.ts"
import { withTemporaryFolder } from "../tools/temporary-folder.ts"
import type { Picture } from "./contact-sheet/screen.ts"

export type ScreensSnapshot = { screens: Screenshot[] }

export type Screenshot = { name: string; picture: Picture }

// The step runs from the working checkout, where its packages are installed, so both commits are pictured the same
// way; it pictures the site of the checkout it runs in.
const takeScreenshots = fileURLToPath(new URL("./take-screenshots.ts", import.meta.url))

export async function extractScreens(checkout: string): Promise<ScreensSnapshot> {
  const screens = await withTemporaryFolder(async (folder) => {
    await runProcess("node", [takeScreenshots], { cwd: checkout, env: { PARALLAX_SCREENS: folder } })
    return readScreens(folder)
  })
  return { screens }
}

async function readScreens(folder: string): Promise<Screenshot[]> {
  try {
    const fileNames = (await readdir(folder)).filter((fileName) => fileName.endsWith(".png")).sort()
    return await Promise.all(fileNames.map((fileName) => readScreen(folder, fileName)))
  } catch (cause) {
    throw new Error(`reading the screenshots in ${folder} failed`, { cause })
  }
}

async function readScreen(folder: string, fileName: string): Promise<Screenshot> {
  const bytes = await readFile(join(folder, fileName))
  const { width, height } = PNG.sync.read(bytes)

  return { name: fileName.slice(0, -".png".length), picture: { png: bytes.toString("base64"), width, height } }
}
