import { deepStrictEqual } from "node:assert/strict"
import { test } from "node:test"

import { openerFor } from "../src/open-file.ts"

test("Windows opens a file with start, given an empty window title so the path isn't taken for one", () => {
  const opener = openerFor("win32", "C:\\work\\canvas.html")

  deepStrictEqual(opener, { program: "cmd", args: ["/c", "start", '""', "C:\\work\\canvas.html"] })
})

test("macOS opens a file with open", () => {
  const opener = openerFor("darwin", "/work/canvas.html")

  deepStrictEqual(opener, { program: "open", args: ["/work/canvas.html"] })
})

test("Linux opens a file with xdg-open", () => {
  const opener = openerFor("linux", "/work/canvas.html")

  deepStrictEqual(opener, { program: "xdg-open", args: ["/work/canvas.html"] })
})
