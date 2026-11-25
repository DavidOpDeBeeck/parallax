import { equal, ok } from "node:assert/strict"
import { execFile } from "node:child_process"
import { test } from "node:test"
import { promisify } from "node:util"

import { describeFailure } from "../src/failure.ts"
import { runProcess } from "../src/process.ts"

test("a failure is said with each of its causes, one per line", () => {
  const failure = new Error("api failed reading 1a2b3c", { cause: new Error("api.yaml is missing") })

  const description = describeFailure(failure)

  equal(description, "api failed reading 1a2b3c\n  because api.yaml is missing")
})

test("a failed process is said once, with how it ended and what it printed", async () => {
  const failure = await runProcess("git", ["no-such-command"], { cwd: "." }).catch((error: unknown) => error)

  const description = describeFailure(failure)

  equal(description.split("\n")[0], "git no-such-command failed with exit code 1")
  equal(description.includes("Command failed"), false)
})

test("a process an extension ran itself is said with its command and what it printed", async () => {
  const ran = await promisify(execFile)("git", ["no-such-command"]).catch((error: unknown) => error)
  const failure = new Error("api failed reading 1a2b3c", { cause: ran })

  const description = describeFailure(failure)

  ok(description.includes("because Command failed: git no-such-command"))
})
