#!/usr/bin/env node
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { ChangeSet } from "../change-set.ts"
import { describeFailure } from "../failure.ts"
import { colorSchemes, pictureFileName } from "../pages.ts"
import { attachFile, type GitHub, keepComment, repositoryIdOf } from "./api.ts"
import { commentBody } from "./body.ts"
import { readPullRequestNumber } from "./event.ts"
import { parseChangeRefs, readWrittenChange } from "./written-change.ts"

async function main(args: string[]): Promise<void> {
  const refs = parseChangeRefs(args)
  const pullRequest = await readPullRequestNumber(process.env.GITHUB_EVENT_PATH)
  if (pullRequest === undefined) {
    process.stderr.write("not a pull request: there is nothing to comment on\n")
    return
  }

  const repository = requiredSetting("GITHUB_REPOSITORY")
  const github: GitHub = {
    api: process.env.GITHUB_API_URL ?? "https://api.github.com",
    token: requiredSetting("GITHUB_TOKEN"),
  }
  const attachToken = optionalSetting("PARALLAX_ATTACH_TOKEN")
  if (attachToken === undefined) {
    throw new Error(
       "the workflow gives parallax no `attach-token`; give it the token of a person or a bot account that can push to the repository, which attaches the pictures to the comment",
    )
  }
  const parallax = requiredSetting("PARALLAX_COMMAND")
  const { change, folder, changeSet } = await readWrittenChange(refs)
  const pictureUrls =
    changeSet === undefined
      ? new Map<string, string>()
      : await attachPictures({ ...github, token: attachToken }, repository, folder, changeSet)
  const body = commentBody({
    commits: change,
    changeSet,
    pictureUrls,
    canvasCommand: { pullRequest, parallax },
  })
  const comment = await keepComment(github, repository, pullRequest, { body, create: changeSet !== undefined })

  process.stdout.write(comment === undefined ? "no change, and no comment to update\n" : `${comment}\n`)
}

async function attachPictures(
  github: GitHub,
  repository: string,
  folder: string,
  changeSet: ChangeSet,
): Promise<Map<string, string>> {
  const fileNames = changeSet.extensions.flatMap(({ views }) =>
    views.flatMap(({ page }) => colorSchemes.map((scheme) => pictureFileName(page, scheme))),
  )
  const repositoryId = await repositoryIdOf(github, repository)
  const pictureUrls = new Map<string, string>()

  for (const fileName of fileNames) {
    const bytes = await readPicture(join(folder, fileName))
    pictureUrls.set(fileName, await attachFile(github, repositoryId, fileName, bytes, "image/png"))
  }
  return pictureUrls
}

async function readPicture(file: string): Promise<Buffer> {
  try {
    return await readFile(file)
  } catch (cause) {
    throw new Error(`reading the picture ${file} failed; the pictures step takes one per view, light and dark`, {
      cause,
    })
  }
}

function requiredSetting(name: string): string {
  const value = optionalSetting(name)
  if (value === undefined) throw new Error(`${name} is not set; the action sets it`)
  return value
}

// An input left empty in a workflow arrives as an empty string: that is no setting.
function optionalSetting(name: string): string | undefined {
  const value = process.env[name]
  return value === undefined || value === "" ? undefined : value
}

main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`${describeFailure(error)}\n`)
  process.exitCode = 1
})
