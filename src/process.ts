import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const outputLimit = 256 * 1024 * 1024
const failureTailLines = 20
const processFailure = "ProcessFailure"

export type ProcessOptions = {
  cwd: string
}

type ExecFileFailure = { code?: number | string; stderr?: string }

export async function runProcess(program: string, args: string[], { cwd }: ProcessOptions): Promise<string> {
  try {
    const { stdout } = await execFileAsync(program, args, { cwd, maxBuffer: outputLimit })
    return stdout
  } catch (cause) {
    const { code, stderr = "" } = cause as ExecFileFailure
    const tail = stderr.trim().split("\n").slice(-failureTailLines).join("\n")
    const ending = typeof code === "number" ? `failed with exit code ${code}` : `failed: ${String(code)}`
    const message = [`${[program, ...args].join(" ")} ${ending}`, tail].filter((part) => part !== "").join("\n")
    const failure = new Error(message, { cause })
    failure.name = processFailure
    throw failure
  }
}

export function isProcessFailure(error: unknown): boolean {
  return error instanceof Error && error.name === processFailure
}
