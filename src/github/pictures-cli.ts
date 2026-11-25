#!/usr/bin/env node
import { describeFailure } from "../failure.ts"
import { takePictures } from "../pictures.ts"
import { parseChangeRefs, readWrittenChange } from "./written-change.ts"

async function main(args: string[]): Promise<void> {
  const { folder, changeSet } = await readWrittenChange(parseChangeRefs(args))
  if (changeSet === undefined) {
    process.stdout.write("no change, and nothing to picture\n")
    return
  }

  const pages = changeSet.extensions.flatMap(({ views }) => views.map(({ page }) => page))
  for (const picture of await takePictures(folder, pages)) process.stdout.write(`${picture}\n`)
}

main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`${describeFailure(error)}\n`)
  process.exitCode = 1
})
