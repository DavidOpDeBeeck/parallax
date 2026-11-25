/** @jsxImportSource preact */

import type { Status } from "./style.ts"
import { statusSigns } from "./style.ts"

export type CountsProps = {
  statuses: Status[]
  markers?: string[]
  facts?: string[]
}

export function Counts({ statuses, markers = [], facts = [] }: CountsProps) {
  const markerCounts = countEach(markers)
  const changes = (["new", "changed", "removed"] as const).flatMap((status) => {
    const count = statuses.filter((each) => each === status).length
    return count === 0 ? [] : [{ status, count }]
  })
  if (markerCounts.size + changes.length + facts.length === 0) return null

  return (
    <p class="counts">
      {[...markerCounts].map(([label, count]) => (
        <span class="count marker">{`${count} ${label}`}</span>
      ))}
      {changes.map(({ status, count }) => (
        <span class={`count ${status}`}>
          <span class="sign">{statusSigns[status]}</span> {`${count} ${status}`}
        </span>
      ))}
      {facts.map((fact) => (
        <span class="count">{fact}</span>
      ))}
    </p>
  )
}

function countEach(labels: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1)
  return counts
}
