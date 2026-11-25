import { readFileSync } from "node:fs"
import { registerHooks } from "node:module"
import { fileURLToPath } from "node:url"

import { transformSync } from "esbuild"

const api = new URL("./api.ts", import.meta.url).href

// An extension always runs against the parallax that runs it, whatever the project installed. A project's
// TypeScript is a module even in a package that says CommonJS, and esbuild takes React's JSX runtime when a file
// names none.
export function resolveParallaxImports(): void {
  registerHooks({
    resolve: (specifier, context, nextResolve) => {
      if (specifier === "parallax") return { url: api, shortCircuit: true }

      const resolved = nextResolve(specifier, context)
      return isProjectTypeScript(resolved.url) ? { ...resolved, format: "module-typescript" } : resolved
    },
    load: (url, context, nextLoad) => {
      if (!isProjectJsx(url)) return nextLoad(url, context)
      return { format: "module", source: compileJsx(url), shortCircuit: true }
    },
  })
}

function isProjectTypeScript(url: string): boolean {
  return url.startsWith("file:") && url.endsWith(".ts") && !url.includes("/node_modules/")
}

function isProjectJsx(url: string): boolean {
  return url.startsWith("file:") && url.endsWith(".tsx") && !url.includes("/node_modules/")
}

function compileJsx(url: string): string {
  const file = fileURLToPath(url)
  try {
    return transformSync(readFileSync(file, "utf8"), {
      loader: "tsx",
      format: "esm",
      jsx: "automatic",
      sourcefile: file,
      sourcemap: "inline",
    }).code
  } catch (cause) {
    throw new Error(`reading ${file} failed`, { cause })
  }
}
