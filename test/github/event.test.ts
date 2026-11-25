import { equal, throws } from "node:assert/strict"
import { test } from "node:test"

import { pullRequestNumberOf } from "../../src/github/event.ts"

test("a pull request event gives its number", () => {
  const event = { pull_request: { number: 7, base: { sha: "aaa" }, head: { sha: "bbb" } } }

  const number = pullRequestNumberOf(event)

  equal(number, 7)
})

test("any other event has no pull request", () => {
  const event = { ref: "refs/heads/main" }

  const number = pullRequestNumberOf(event)

  equal(number, undefined)
})

test("a pull request event without its number fails, saying what it got", () => {
  const event = { pull_request: { number: "7" } }

  const read = () => pullRequestNumberOf(event)

  throws(read, { message: 'a pull request event must have a number; got "7"' })
})
