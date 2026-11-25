import { ok, throws } from "node:assert/strict"
import { test } from "node:test"
import type { ChangeSet } from "../../src/change-set.ts"
import { type CommentContent, commentBody } from "../../src/github/body.ts"

const commits = { base: "1111111111111111", head: "2222222222222222" }
const changeSet: ChangeSet = {
  ...commits,
  extensions: [
    { name: "api", delta: {}, views: [{ title: "API", page: "api.html" }] },
    { name: "schema", views: [] },
  ],
}
const pictureUrls = new Map([
  ["api-light.png", "https://example.test/light"],
  ["api-dark.png", "https://example.test/dark"],
])

function body(content: Partial<CommentContent>): string {
  return commentBody({
    commits,
    changeSet,
    pictureUrls,
    canvasCommand: { pullRequest: 38, parallax: "npx --yes github:owner/parallax#v1" },
    ...content,
  })
}

test("each view is headed by its title", () => {
  const text = body({})

  ok(text.includes("#### API"))
})

test("a view's picture is shown light or dark, as the reader's GitHub is", () => {
  const text = body({})

  ok(
    text.includes(
      '#### API\n\n<picture><source media="(prefers-color-scheme: dark)" srcset="https://example.test/dark"><img alt="API" src="https://example.test/light"></picture>',
    ),
  )
})

test("the extensions that found no change are named", () => {
  const text = body({})

  ok(text.includes("No change: schema"))
})

test("a change with nothing in it says so", () => {
  const text = body({ changeSet: undefined })

  ok(text.endsWith("\n\nNo change.\n"))
})

test("the comment ends with how to open the change on the canvas from the reader's clone", () => {
  const text = body({})

  ok(
    text.endsWith(
      "```sh\ngit fetch origin pull/38/head\nnpx --yes github:owner/parallax#v1 --base 111111111111 --head 222222222222 --open\n```\n",
    ),
  )
})

test("a view without its pictures fails, rather than leaving it out of the comment", () => {
  const withoutDark = new Map([["api-light.png", "https://example.test/light"]])

  const write = () => body({ pictureUrls: withoutDark })

  throws(write, (error: Error) => error.message.startsWith("api.html has no attached picture"))
})
