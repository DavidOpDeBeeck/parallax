import { basename } from "node:path"

import type { Change } from "parallax"
import { runProcess } from "../tools/run-process.ts"
import type { ChangedFile, CodeDelta } from "./code.ts"

type Entry = { path: string; letter: string; movedFrom?: string }

type Lines = { added: number; removed: number }

// Their lines say little about the change.
const lockFiles = [
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lock",
  "Cargo.lock",
  "go.sum",
  "poetry.lock",
  "uv.lock",
  "Gemfile.lock",
  "composer.lock",
]

export async function compareCode(change: Change): Promise<CodeDelta | undefined> {
  const files = (await diffFiles(change)).filter((file) => !lockFiles.includes(basename(file.path)))

  return files.length === 0 ? undefined : { files }
}

async function diffFiles(change: Change): Promise<ChangedFile[]> {
  const range = [change.base, change.head]
  const options = ["diff", "--no-color", "--no-ext-diff", "--find-renames", "-z"]
  const entries = parseNameStatus(await git(change, [...options, "--name-status", ...range]))
  const lines = parseNumstat(await git(change, [...options, "--numstat", ...range]))

  return entries
    .map((entry) => changedFile(entry, lines.get(entry.path) ?? { added: 0, removed: 0 }))
    .sort((left, right) => (left.path < right.path ? -1 : 1))
}

async function git(change: Change, args: string[]): Promise<string> {
  return (await runProcess("git", args, { cwd: change.repository })).trimEnd()
}

function changedFile({ path, letter, movedFrom }: Entry, { added, removed }: Lines): ChangedFile {
  const file: ChangedFile = { path, status: statusOf(letter, added + removed), added, removed }
  if (movedFrom !== undefined) file.movedFrom = movedFrom
  return file
}

function statusOf(letter: string, lineCount: number): ChangedFile["status"] {
  if (letter === "A") return "new"
  if (letter === "D") return "removed"
  if (letter === "R" && lineCount === 0) return "unchanged"
  return "changed"
}

// `--name-status -z`: a letter (with a score after R), then the path, or the old and new path of a rename.
function parseNameStatus(output: string): Entry[] {
  const fields = output.split("\0")
  const entries: Entry[] = []

  for (let index = 0; index < fields.length && fields[index] !== ""; ) {
    const letter = fields[index]!.charAt(0)
    if (letter === "R" || letter === "C") {
      entries.push({ letter, movedFrom: fields[index + 1]!, path: fields[index + 2]! })
      index += 3
    } else {
      entries.push({ letter, path: fields[index + 1]! })
      index += 2
    }
  }

  return entries
}

// `--numstat -z`: added, removed and the path, or an empty path followed by the old and new path of a rename.
function parseNumstat(output: string): Map<string, Lines> {
  const fields = output.split("\0")
  const lines = new Map<string, Lines>()

  for (let index = 0; index < fields.length && fields[index] !== ""; ) {
    const [added = "0", removed = "0", path = ""] = fields[index]!.split("\t")
    const count = { added: lineCount(added), removed: lineCount(removed) }
    if (path === "") {
      lines.set(fields[index + 2]!, count)
      index += 3
    } else {
      lines.set(path, count)
      index += 1
    }
  }

  return lines
}

// Git counts no lines in a binary file, and says `-`.
function lineCount(field: string): number {
  return field === "-" ? 0 : Number(field)
}
