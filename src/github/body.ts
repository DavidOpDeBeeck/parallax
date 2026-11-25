import type { ChangeSet } from "../change-set.ts"
import { shortCommit } from "../git.ts"
import { escapeHtml } from "../html.ts"
import { pictureFileName } from "../pages.ts"

type Commits = Pick<ChangeSet, "base" | "head">

export type CommentContent = {
  commits: Commits
  changeSet: ChangeSet | undefined
  pictureUrls: Map<string, string>
  canvasCommand: CanvasCommand
}

export type CanvasCommand = { pullRequest: number; parallax: string }

export function commentBody({ commits, changeSet, pictureUrls, canvasCommand }: CommentContent): string {
  const heading = `**parallax** · \`${shortCommit(commits.base)}\` → \`${shortCommit(commits.head)}\``
  if (changeSet === undefined) return `${heading}\n\nNo change.\n`

  const sections = changeSet.extensions.flatMap(({ views }) =>
    views.map(({ title, page }) => [`#### ${title}`, picture(title, page, pictureUrls)].join("\n\n")),
  )
  const unchanged = changeSet.extensions.filter(({ views }) => views.length === 0).map(({ name }) => name)

  return [
    heading,
    ...sections,
    ...(unchanged.length > 0 ? [`No change: ${unchanged.join(", ")}`] : []),
    canvasCommandText(commits, canvasCommand),
  ]
    .join("\n\n")
    .concat("\n")
}

function picture(title: string, page: string, pictureUrls: Map<string, string>): string {
  const lightUrl = pictureUrls.get(pictureFileName(page, "light"))
  const darkUrl = pictureUrls.get(pictureFileName(page, "dark"))
  if (lightUrl === undefined || darkUrl === undefined) {
    throw new Error(`${page} has no attached picture, light and dark; got ${JSON.stringify({ lightUrl, darkUrl })}`)
  }

  return `<picture><source media="(prefers-color-scheme: dark)" srcset="${darkUrl}"><img alt="${escapeHtml(title)}" src="${lightUrl}"></picture>`
}

function canvasCommandText(commits: Commits, { pullRequest, parallax }: CanvasCommand): string {
  return [
    "To open it on the canvas, from your clone:",
    "",
    "```sh",
    `git fetch origin pull/${pullRequest}/head`,
    `${parallax} --base ${shortCommit(commits.base)} --head ${shortCommit(commits.head)} --open`,
    "```",
  ].join("\n")
}
