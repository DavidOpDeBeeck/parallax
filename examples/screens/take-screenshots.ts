import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { chromium, type Page } from "playwright"

const pages = [
  { name: "Home", file: "index.html" },
  { name: "Reports", file: "reports.html" },
  { name: "Settings", file: "settings.html" },
]

const stillStyle =
  "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }"
const settleAttempts = 10
const settleDelay = 100

const site = resolve("examples/screens/site")
const screensFolder = process.env.PARALLAX_SCREENS
if (screensFolder === undefined) throw new Error("PARALLAX_SCREENS names no folder to write the screenshots into")

// Rendering that doesn't depend on timing or the machine's display: no GPU, one colour profile, plain grey text.
const browser = await chromium.launch({
  args: [
    "--disable-gpu",
    "--force-color-profile=srgb",
    "--font-render-hinting=none",
    "--disable-lcd-text",
    "--disable-skia-runtime-opts",
    "--disable-partial-raster",
    "--disable-threaded-animation",
    "--disable-threaded-scrolling",
    "--disable-checker-imaging",
    "--run-all-compositor-stages-before-draw",
  ],
})
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
    reducedMotion: "reduce",
  })
  await context.clock.setFixedTime(new Date("2026-01-01T12:00:00Z"))

  for (const { name, file } of pages) {
    const path = join(site, file)
    if (!existsSync(path)) continue

    const page = await context.newPage()
    await page.goto(pathToFileURL(path).href, { waitUntil: "load" })
    await page.addStyleTag({ content: stillStyle })
    await page.evaluate(async () => {
      await document.fonts.ready
    })
    await settledScreenshot(page, join(screensFolder, `${name}.png`))
    await page.close()
  }
} finally {
  await browser.close()
}

async function settledScreenshot(page: Page, path: string): Promise<void> {
  let previous = await page.screenshot({ fullPage: true })

  for (let attempt = 0; attempt < settleAttempts; attempt++) {
    await page.waitForTimeout(settleDelay)
    const next = await page.screenshot({ fullPage: true, path })
    if (next.equals(previous)) return
    previous = next
  }
  throw new Error(`${path} never stopped changing`)
}
