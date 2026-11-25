import { isProcessFailure } from "./process.ts"

export function describeFailure(error: unknown): string {
  const lines: string[] = []
  let current: unknown = error

  while (current !== undefined) {
    const message = current instanceof Error ? current.message : String(current)
    lines.push(lines.length === 0 ? message : `  because ${message.replaceAll("\n", "\n    ")}`)
    // Its cause is execFile's own error, which says again what it has already said in full.
    if (isProcessFailure(current)) break
    current = current instanceof Error ? current.cause : undefined
  }

  return lines.join("\n")
}
