import { existsSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

import type { Config } from "./api.ts"
import { fieldOf } from "./json-field.ts"

const configFile = "parallax.config.ts"

const reservedNames = ["canvas"]

export async function loadConfig(repository: string): Promise<Config> {
  const file = join(repository, configFile)
  if (!existsSync(file)) {
    throw new Error(
      `there is no ${configFile} in ${repository}; write one that exports the extensions to run: export default { extensions: [...] }`,
    )
  }

  let module: unknown
  try {
    module = await import(pathToFileURL(file).href)
  } catch (cause) {
    throw new Error(`loading ${file} failed`, { cause })
  }
  return configOf(module)
}

function configOf(module: unknown): Config {
  const exported = fieldOf(module, "default")
  const extensions = fieldOf(exported, "extensions")
  if (!Array.isArray(extensions)) {
    const found = exported === undefined ? "no default export" : "a default export without a list of extensions"
    throw new Error(`${configFile} must export its extensions: export default { extensions: [...] }; got ${found}`)
  }

  const names = extensions.map((extension) => String(fieldOf(extension, "name")))
  const reserved = names.find((name) => reservedNames.includes(name))
  if (reserved !== undefined) {
    throw new Error(`an extension can't be named "${reserved}": the canvas is written as ${reserved}.html`)
  }
  const repeated = names.find((name, index) => names.indexOf(name) !== index)
  if (repeated !== undefined) {
    throw new Error(
      `two extensions are named "${repeated}"; each needs a name of its own, as its pages are named after it`,
    )
  }
  return exported as Config
}
