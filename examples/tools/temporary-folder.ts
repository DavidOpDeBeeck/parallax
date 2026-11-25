import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

export async function withTemporaryFolder<Result>(use: (folder: string) => Promise<Result>): Promise<Result> {
  const folder = await mkdtemp(join(tmpdir(), "parallax-"))

  try {
    return await use(folder)
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
}
