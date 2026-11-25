#!/usr/bin/env node
// Node won't strip TypeScript's types inside node_modules, where an installed parallax lives, so this strips its own
// files and runs the command. It is plain JavaScript for the same reason.

import { readFileSync } from "node:fs"
import { registerHooks, stripTypeScriptTypes } from "node:module"
import { fileURLToPath } from "node:url"

const sources = new URL("../src/", import.meta.url).href

registerHooks({
  load: (url, context, nextLoad) => {
    if (!url.startsWith(sources) || !url.endsWith(".ts")) return nextLoad(url, context)
    return {
      format: "module",
      source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8")),
      shortCircuit: true,
    }
  },
})

await import("../src/cli.ts")
