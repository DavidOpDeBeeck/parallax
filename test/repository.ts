import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

import { runGit } from "../src/git.ts"

export async function initRepository(folder: string): Promise<void> {
  await runGit(folder, ["init", "--initial-branch=main"])
  await runGit(folder, ["config", "user.name", "Test"])
  await runGit(folder, ["config", "user.email", "test@example.com"])
  await runGit(folder, ["config", "commit.gpgsign", "false"])
}

export async function writeFiles(folder: string, files: Record<string, string>): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    const file = join(folder, path)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, content)
  }
}

export async function commitFiles(folder: string, files: Record<string, string>, message: string): Promise<string> {
  await writeFiles(folder, files)
  await runGit(folder, ["add", "--all"])
  await runGit(folder, ["commit", "--message", message])
  return runGit(folder, ["rev-parse", "HEAD"])
}
