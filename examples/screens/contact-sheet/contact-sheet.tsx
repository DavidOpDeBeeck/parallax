/** @jsxImportSource preact */
import { Counts } from "../../design/counts.tsx"
import { renderPage } from "../../design/page.tsx"
import type { Screen, Screens } from "./screen.ts"

const order = { new: 0, removed: 1, changed: 2, unchanged: 3 }

const css = `
.sheet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.screen { margin: 0; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
.screen figcaption { display: flex; justify-content: space-between; gap: 8px; padding: 6px 10px; background: var(--band); border-bottom: 1px solid var(--line); }
.screen.new figcaption { background: var(--new-tint); }
.screen.removed figcaption { background: var(--removed-tint); }
.shot { position: relative; }
.shot img { display: block; width: 100%; height: auto; }
.screen.removed .shot img { opacity: 0.4; }
.mark { position: absolute; border: 2px solid var(--changed); border-radius: 2px; }
.mark span { position: absolute; top: -2px; left: -2px; padding: 0 4px; background: var(--changed); color: var(--background); font-size: 10px; font-weight: 600; }
.unchanged-note { margin: 16px 0 0; color: var(--muted); }
`

export function contactSheetPage({ screens }: Screens): string {
  const touched = screens
    .filter((screen) => screen.status !== "unchanged" && screen.picture !== undefined)
    .sort((left, right) => order[left.status] - order[right.status])
  const unchanged = screens.filter((screen) => screen.status === "unchanged").length

  return renderPage(
    css,
    <>
      <Counts statuses={touched.map((screen) => screen.status)} />
      <div class="sheet">
        {touched.map((screen) => (
          <Thumbnail screen={screen} />
        ))}
      </div>
      {unchanged > 0 && (
        <p class="unchanged-note">{`${unchanged} ${unchanged === 1 ? "screen didn't" : "screens didn't"} change.`}</p>
      )}
    </>,
  )
}

// Marks are placed as shares of the picture, so they stay on what changed however wide the thumbnail is.
function Thumbnail({ screen }: { screen: Screen }) {
  const picture = screen.picture!
  const share = (part: number, whole: number) => `${((part / whole) * 100).toFixed(3)}%`
  const kind = `${screen.status} screen`

  return (
    <figure class={`screen ${screen.status}`}>
      <figcaption>
        <code>{screen.name}</code>
        <span class={screen.status}>{kind}</span>
      </figcaption>
      <div class="shot">
        <img alt={screen.name} src={`data:image/png;base64,${picture.png}`} />
        {(screen.marks ?? []).map((mark, index) => (
          <div
            class="mark"
            style={`left:${share(mark.x, picture.width)};top:${share(mark.y, picture.height)};width:${share(mark.width, picture.width)};height:${share(mark.height, picture.height)}`}
          >
            <span>{index + 1}</span>
          </div>
        ))}
      </div>
    </figure>
  )
}
