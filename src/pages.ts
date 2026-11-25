import type { View } from "./api.ts"
import { escapeHtml } from "./html.ts"
import type { ExtensionResult } from "./run.ts"

export const pageWidth = 880

export type ColorScheme = "light" | "dark"

export const colorSchemes: ColorScheme[] = ["light", "dark"]

export type Page = { fileName: string; view: View }

export type PageDocumentOptions = {
  frameScript?: string
}

export function pagesOf(results: ExtensionResult[]): Page[] {
  return results.flatMap(({ name, views }) =>
    views.map((view, index): Page => ({ fileName: pageFileName(name, index, views.length), view })),
  )
}

export function pageFileName(extension: string, index: number, count: number): string {
  return count === 1 ? `${extension}.html` : `${extension}-${index + 1}.html`
}

export function pictureFileName(page: string, scheme: ColorScheme): string {
  return `${page.replace(/\.html$/, "")}-${scheme}.png`
}

export function pageDocument({ title, html }: View, { frameScript }: PageDocumentOptions = {}): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    `<meta name="viewport" content="width=${pageWidth}">`,
    `<title>${escapeHtml(title)}</title>`,
    "</head>",
    "<body>",
    html,
    ...(frameScript === undefined ? [] : [`<script>\n${frameScript}</script>`]),
    "</body>",
    "</html>",
    "",
  ].join("\n")
}
