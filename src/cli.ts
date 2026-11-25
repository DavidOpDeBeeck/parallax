#!/usr/bin/env node
import { relative } from "node:path"
import { parseArgs } from "node:util"

import { findChange, hasUncommittedWork } from "./change.ts"
import { loadConfig } from "./config.ts"
import { describeFailure } from "./failure.ts"
import { openFile } from "./open-file.ts"
import { writeChange } from "./output.ts"
import { resolveParallaxImports } from "./parallax-imports.ts"
import { runChange } from "./run.ts"

const usage = `usage: parallax [--base <ref>] [--head <commit>] [--open]

Draws what changed between the head and where its branch left the base.
  --base <ref>     the ref the head is compared with (default: main)
  --head <commit>  the commit to look at (default: HEAD)
  --open           opens the canvas in your browser once it is drawn`

async function main(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      base: { type: "string", default: "main" },
      head: { type: "string", default: "HEAD" },
      open: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
    allowPositionals: false,
  })
  if (values.help) {
    process.stdout.write(`${usage}\n`)
    return
  }

  const change = await findChange(process.cwd(), { base: values.base, head: values.head })
  if (await hasUncommittedWork(change.repository)) {
    printProgress("uncommitted work is not read: parallax reads commits")
  }
  resolveParallaxImports()
  const config = await loadConfig(change.repository)
  const results = await runChange(change, config, { onProgress: printProgress })
  const unchanged = results.filter(({ views }) => views.length === 0).map(({ name }) => name)
  if (unchanged.length === results.length) {
    process.stdout.write("no change\n")
    return
  }

  const written = await writeChange(change, results)
  for (const file of [...written.pages, written.canvas, written.changeSet]) {
    process.stdout.write(`${relative(process.cwd(), file)}\n`)
  }
  if (unchanged.length > 0) process.stdout.write(`no change: ${unchanged.join(", ")}\n`)
  if (values.open) await openFile(written.canvas)
}

function printProgress(line: string): void {
  process.stderr.write(`${line}\n`)
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const isUsageMistake =
    error instanceof TypeError && "code" in error && String(error.code).startsWith("ERR_PARSE_ARGS")
  process.stderr.write(`${describeFailure(error)}\n${isUsageMistake ? `\n${usage}\n` : ""}`)
  process.exitCode = 1
})
