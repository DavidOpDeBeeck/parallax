import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { type Browser, chromium } from "playwright"
import { type ColorScheme, colorSchemes, pageWidth, pictureFileName } from "./pages.ts"

// The page grows down from this; the picture is of the whole page, however tall.
const startHeight = 100

export async function takePictures(folder: string, pages: string[]): Promise<string[]> {
  const browser = await launchChromium()
  const taken: string[] = []

  try {
    for (const page of pages) {
      const html = await readFile(join(folder, page), "utf8")
      for (const scheme of colorSchemes) {
        const fileName = pictureFileName(page, scheme)
        try {
          await takePicture(browser, { html, scheme, path: join(folder, fileName) })
        } catch (cause) {
          throw new Error(`taking the ${scheme} picture of ${page} failed`, { cause })
        }
        taken.push(fileName)
      }
    }
  } finally {
    await browser.close()
  }
  return taken
}

type PictureOptions = { html: string; scheme: ColorScheme; path: string }

async function takePicture(browser: Browser, { html, scheme, path }: PictureOptions): Promise<void> {
  const context = await browser.newContext({ viewport: { width: pageWidth, height: startHeight }, colorScheme: scheme })

  try {
    await context.route("**/*", (route) => route.abort())
    const tab = await context.newPage()
    await tab.setContent(html, { waitUntil: "load" })
    await tab.screenshot({ path, fullPage: true })
  } finally {
    await context.close()
  }
}

async function launchChromium(): Promise<Browser> {
  try {
    return await chromium.launch()
  } catch (cause) {
    throw new Error(
      "starting Chromium to take the pictures failed; install it with `npx playwright install chromium`",
      {
        cause,
      },
    )
  }
}
