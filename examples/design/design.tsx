/** @jsxImportSource preact */
import type { Change, CommitsExtension } from "parallax"
import { runProcess } from "../tools/run-process.ts"
import { Counts } from "./counts.tsx"
import { renderPage } from "./page.tsx"
import { type Status, statusSigns } from "./style.ts"

export type DesignDelta = { files: DesignFile[] }

type DesignFile = { path: string; status: Status }

const statuses: Status[] = ["new", "changed", "removed", "unchanged"]

const inks = ["ink", "muted", "line", "band"]

const css = `
.changed-files { margin: -12px 0 24px; color: var(--muted); }
.design section { margin: 0 0 24px; }
.design h3 { margin: 0 0 10px; color: var(--muted); font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
.swatches { display: flex; flex-wrap: wrap; gap: 8px; }
.swatch { width: 152px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; }
.swatch.new { background: var(--new-tint); }
.swatch.changed { background: var(--changed-tint); }
.swatch.removed { background: var(--removed-tint); }
.swatch.unchanged { background: var(--unchanged-tint); }
.swatch.marker { background: var(--marker-tint); border-color: var(--marker-line); color: var(--marker); }
.ink-swatch { display: inline-block; width: 12px; height: 12px; margin-right: 6px; border-radius: 2px; vertical-align: -1px; }
`

const folder = "examples/design"

export function design(): CommitsExtension<DesignDelta> {
  return {
    name: "design",
    compareCommits: compareDesign,
    show: (delta) => [{ title: "Design", html: designPage(delta) }],
  }
}

async function compareDesign(change: Change): Promise<DesignDelta | undefined> {
  const printed = await runProcess("git", ["diff", "--name-status", "-z", change.base, change.head, "--", folder], {
    cwd: change.repository,
  })
  const files = parseNameStatus(printed).sort((left, right) => (left.path < right.path ? -1 : 1))

  return files.length === 0 ? undefined : { files }
}

// `--name-status -z`: a letter (with a score after R and C), then the path, or the old and new path of a rename.
function parseNameStatus(printed: string): DesignFile[] {
  const fields = printed.split("\0")
  const files: DesignFile[] = []

  for (let index = 0; index < fields.length && fields[index] !== ""; ) {
    const letter = fields[index]!.charAt(0)
    const moved = letter === "R" || letter === "C"
    files.push({ path: fields[index + (moved ? 2 : 1)]!, status: statusOf(letter) })
    index += moved ? 3 : 2
  }

  return files
}

function statusOf(letter: string): Status {
  if (letter === "A") return "new"
  if (letter === "D") return "removed"
  return "changed"
}

function designPage({ files }: DesignDelta): string {
  return renderPage(
    css,
    <>
      <Counts statuses={files.map((file) => file.status)} />
      <p class="changed-files">
        {files.map(({ path, status }, index) => (
          <>
            {index > 0 && " · "}
            <code class={status}>{path.slice(folder.length + 1)}</code>
          </>
        ))}
      </p>
      <Parts />
    </>,
  )
}

function Parts() {
  return (
    <div class="design">
      <section>
        <h3>Statuses and their signs</h3>
        <div class="swatches">
          {statuses.map((status) => (
            <div class={`swatch ${status}`}>
              <span class={`sign ${status}`}>{statusSigns[status]}</span> <span class={status}>{status}</span>
            </div>
          ))}
          <div class="swatch marker">a reason to look</div>
        </div>
      </section>

      <section>
        <h3>Ink and grey</h3>
        <div class="swatches">
          {inks.map((ink) => (
            <div class="swatch">
              <span class="ink-swatch" style={`background: var(--${ink})`} />
              <code>--{ink}</code>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>Counts</h3>
        <Counts
          statuses={["new", "new", "changed", "removed"]}
          markers={["breaking", "breaking"]}
          facts={["+121 −42 lines"]}
        />
      </section>

      <section>
        <h3>A reason to look</h3>
        <p class="marker-note">
          <span class="label">breaking</span>
          <code>owner</code> was required
        </p>
      </section>

      <section>
        <h3>Names and prose</h3>
        <p>
          Prose is set in the sans-serif; a name as it is written, in monospace: <code>GET /tickets/{"{id}"}</code>.
        </p>
      </section>
    </div>
  )
}
