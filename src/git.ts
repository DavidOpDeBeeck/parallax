import { runProcess } from "./process.ts"

export async function runGit(repository: string, args: string[]): Promise<string> {
  const printed = await runProcess("git", args, { cwd: repository })
  return printed.trimEnd()
}

export function shortCommit(commit: string): string {
  return commit.slice(0, 12)
}
