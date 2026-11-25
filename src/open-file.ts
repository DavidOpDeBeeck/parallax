import { dirname } from "node:path"

import { runProcess } from "./process.ts"

export type Opener = { program: string; args: string[] }

export function openerFor(platform: NodeJS.Platform, file: string): Opener {
  if (platform === "win32") return { program: "cmd", args: ["/c", "start", '""', file] }
  if (platform === "darwin") return { program: "open", args: [file] }
  return { program: "xdg-open", args: [file] }
}

export async function openFile(file: string): Promise<void> {
  const { program, args } = openerFor(process.platform, file)
  await runProcess(program, args, { cwd: dirname(file) })
}
