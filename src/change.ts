import { runGit } from "./git.ts"

export type Change = { repository: string; base: string; head: string }

export type ChangeRefs = { base: string; head: string }

export async function findChange(directory: string, { base, head }: ChangeRefs): Promise<Change> {
  const repository = await runGit(directory, ["rev-parse", "--show-toplevel"])
  const headCommit = await resolveCommit(repository, head)
  const baseCommit = await resolveCommit(repository, base)

  try {
    const branchPoint = await runGit(repository, ["merge-base", baseCommit, headCommit])
    return { repository, base: branchPoint, head: headCommit }
  } catch (cause) {
    throw new Error(`${head} has no history in common with ${base}, so there is no base to compare it with`, { cause })
  }
}

export async function hasUncommittedWork(repository: string): Promise<boolean> {
  const status = await runGit(repository, ["status", "--porcelain"])
  return status !== ""
}

async function resolveCommit(repository: string, ref: string): Promise<string> {
  try {
    return await runGit(repository, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`])
  } catch (cause) {
    throw new Error(`${ref} is not a commit in ${repository}`, { cause })
  }
}
