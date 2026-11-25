import type { CommitsExtension } from "parallax"
import type { Status } from "../design/style.ts"
import { compareCode } from "./compare.ts"
import { codePage } from "./show.tsx"

export type CodeDelta = { files: ChangedFile[] }

export type ChangedFile = {
  path: string
  status: Status
  added: number
  removed: number
  movedFrom?: string
}

export function code(): CommitsExtension<CodeDelta> {
  return {
    name: "code",
    compareCommits: compareCode,
    show: (delta) => [{ title: "Code", html: codePage(delta) }],
  }
}
