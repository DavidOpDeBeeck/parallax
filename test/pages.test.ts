import { deepStrictEqual, ok } from "node:assert/strict"
import { test } from "node:test"

import { pageDocument, pagesOf, pictureFileName } from "../src/pages.ts"

const view = { title: "API & more", html: "<p>tickets</p>" }

test("a view's page is named after its extension", () => {
  const pages = pagesOf([{ name: "api", views: [view] }])

  deepStrictEqual(
    pages.map((page) => page.fileName),
    ["api.html"],
  )
})

test("the views of an extension that shows several are numbered", () => {
  const pages = pagesOf([{ name: "api", views: [view, view] }])

  deepStrictEqual(
    pages.map((page) => page.fileName),
    ["api-1.html", "api-2.html"],
  )
})

test("a page's pictures are named after it, light and dark", () => {
  const names = [pictureFileName("api-2.html", "light"), pictureFileName("api-2.html", "dark")]

  deepStrictEqual(names, ["api-2-light.png", "api-2-dark.png"])
})

test("a page is the view's HTML as it is, in a document with its title and width", () => {
  const document = pageDocument(view)

  ok(document.includes("<title>API &amp; more</title>"))
  ok(document.includes('<meta name="viewport" content="width=880">'))
  ok(document.includes("<body>\n<p>tickets</p>\n</body>"))
})
