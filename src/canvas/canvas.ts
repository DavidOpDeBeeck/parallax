import { readFileSync } from "node:fs"
import { basename } from "node:path"
import type { View } from "../api.ts"
import type { Change } from "../change.ts"
import { shortCommit } from "../git.ts"
import { escapeHtml } from "../html.ts"
import { pageDocument } from "../pages.ts"
import type { ExtensionResult } from "../run.ts"

const style = readFileSync(new URL("./canvas.css", import.meta.url), "utf8")
const boardScript = readFileSync(new URL("./board.js", import.meta.url), "utf8")
const frameScript = readFileSync(new URL("./frame.js", import.meta.url), "utf8")
const logo = readFileSync(new URL("./logo.svg", import.meta.url), "utf8").trim()

export function buildCanvas(change: Change, results: ExtensionResult[]): string {
  const repository = escapeHtml(basename(change.repository))
  const commits = `${shortCommit(change.base)} → ${shortCommit(change.head)}`

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>parallax: ${repository} ${commits}</title>`,
    `<style>\n${style}</style>`,
    "</head>",
    "<body>",
    '<header class="bar">',
    logo,
    `<h1>${repository}</h1>`,
    `<span class="commits">${commits}</span>`,
    '<span class="hint">drag to pan · scroll or pinch to zoom · <kbd>f</kbd> to fit · click a view to use it, <kbd>Esc</kbd> to leave</span>',
    "</header>",
    '<main class="viewport" tabindex="0">',
    '<div class="board">',
    ...results.map(drawArea),
    "</div>",
    "</main>",
    `<script>\n${boardScript}</script>`,
    "</body>",
    "</html>",
    "",
  ].join("\n")
}

function drawArea({ name, views }: ExtensionResult): string {
  const opening = `<section class="area" data-extension="${escapeHtml(name)}">`
  if (views.length === 0) return `${opening}<h2>${escapeHtml(name)}</h2><p class="nothing">no change</p></section>`

  return `${opening}\n${views.map(drawView).join("\n")}\n</section>`
}

function drawView(view: View): string {
  const page = escapeHtml(pageDocument(view, { frameScript }))
  const title = escapeHtml(view.title)
  return `<figure class="view"><h2>${title}</h2><iframe sandbox="allow-scripts" title="${title}" srcdoc="${page}"></iframe></figure>`
}
