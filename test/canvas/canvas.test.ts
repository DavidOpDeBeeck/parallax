import { equal, ok } from "node:assert/strict"
import { test } from "node:test"

import { buildCanvas } from "../../src/canvas/canvas.ts"
import type { Change } from "../../src/change.ts"
import type { ExtensionResult } from "../../src/run.ts"

const change: Change = {
  repository: "/work/tickets",
  base: "1111111111111111111111111111111111111111",
  head: "2222222222222222222222222222222222222222",
}

const results: ExtensionResult[] = [
  { name: "api", delta: {}, views: [{ title: "API", html: '<p class="endpoint">POST /tickets</p>' }] },
  { name: "schema", views: [] },
]

test("each view's page is carried in a sandboxed frame of its own, headed by its title", () => {
  const canvas = buildCanvas(change, results)

  ok(canvas.includes('<figure class="view"><h2>API</h2><iframe sandbox="allow-scripts" title="API" srcdoc="'))
  ok(canvas.includes("&lt;p class=&quot;endpoint&quot;&gt;POST /tickets&lt;/p&gt;"))
})

test("an extension that found no change says so on the canvas", () => {
  const canvas = buildCanvas(change, results)

  ok(canvas.includes('<h2>schema</h2><p class="nothing">no change</p>'))
})

test("the areas are in the config's order", () => {
  const canvas = buildCanvas(change, [...results].reverse())

  ok(canvas.indexOf(`data-extension="schema"`) < canvas.indexOf(`data-extension="api"`))
})

test("an extension with views is headed by their titles, not by its name", () => {
  const canvas = buildCanvas(change, results)

  ok(!canvas.includes("<h2>api</h2>"))
})

test("the canvas names the repository and both commits", () => {
  const canvas = buildCanvas(change, results)

  ok(canvas.includes("<h1>tickets</h1>"))
  ok(canvas.includes("111111111111 → 222222222222"))
})

test("the canvas needs nothing else: it loads no other file", () => {
  const canvas = buildCanvas(change, results)

  ok(!/<(link|img)\b/.test(canvas))
  ok(!/\b(src|href)=/.test(canvas))
  ok(!canvas.includes("@import"))
})

test("the same change always gives the same canvas", () => {
  const copy = structuredClone(results)

  const canvases = [buildCanvas(change, results), buildCanvas(change, copy)]

  equal(canvases[0], canvases[1])
})
