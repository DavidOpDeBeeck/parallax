import { PNG } from "pngjs"

import { pairByKey } from "../tools/pair-by-key.ts"
import type { Mark, Picture, Screen } from "./contact-sheet/screen.ts"
import type { Screenshot } from "./extract.ts"
export function compareScreens(base: Screenshot[], head: Screenshot[]): Screen[] {
  return pairByKey(base, head, (screen) => screen.name).map(({ base: before, head: after }): Screen => {
    if (before === undefined) return { name: after!.name, status: "new", picture: after!.picture }
    if (after === undefined) return { name: before.name, status: "removed", picture: before.picture }

    const marks = findMarks(before.picture, after.picture)
    if (marks.length === 0) return { name: after.name, status: "unchanged" }
    return { name: after.name, status: "changed", picture: after.picture, marks }
  })
}

type Decoded = { width: number; height: number; data: Buffer }

type Cell = { column: number; row: number }

const cellSize = 8
const colourThreshold = 16
// Changes closer together than this are one outline, the way a form's fields stacked in a column are one.
const nearby = 32

function findMarks(base: Picture, head: Picture): Mark[] {
  const before = decode(base)
  const after = decode(head)
  const columns = Math.ceil(Math.max(before.width, after.width) / cellSize)
  const rows = Math.ceil(Math.max(before.height, after.height) / cellSize)
  const changed = changedCells(before, after, columns, rows)

  const regions = gatherRegions(changed, columns, rows).map((cells) => boundsOf(cells))
  return mergeNearby(regions)
    .map((mark) => clip(mark, after))
    .filter((mark) => mark.width > 0 && mark.height > 0)
    .sort((left, right) => left.y - right.y || left.x - right.x)
}

function decode(picture: Picture): Decoded {
  return PNG.sync.read(Buffer.from(picture.png, "base64"))
}

function changedCells(before: Decoded, after: Decoded, columns: number, rows: number): boolean[] {
  const changed = new Array<boolean>(columns * rows).fill(false)
  const width = Math.max(before.width, after.width)
  const height = Math.max(before.height, after.height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = Math.floor(y / cellSize) * columns + Math.floor(x / cellSize)
      if (!changed[cell] && pixelDiffers(before, after, x, y)) changed[cell] = true
    }
  }
  return changed
}

function pixelDiffers(before: Decoded, after: Decoded, x: number, y: number): boolean {
  const inBefore = x < before.width && y < before.height
  const inAfter = x < after.width && y < after.height
  if (inBefore !== inAfter) return true
  if (!inBefore) return false

  const beforeIndex = (y * before.width + x) * 4
  const afterIndex = (y * after.width + x) * 4
  for (let channel = 0; channel < 4; channel++) {
    const difference = Math.abs((before.data[beforeIndex + channel] ?? 0) - (after.data[afterIndex + channel] ?? 0))
    if (difference > colourThreshold) return true
  }
  return false
}

function gatherRegions(changed: boolean[], columns: number, rows: number): Cell[][] {
  const seen = new Array<boolean>(changed.length).fill(false)
  const regions: Cell[][] = []

  for (let start = 0; start < changed.length; start++) {
    if (!changed[start] || seen[start]) continue

    const region: Cell[] = []
    const waiting = [start]
    seen[start] = true
    while (waiting.length > 0) {
      const index = waiting.pop()!
      const cell = { column: index % columns, row: Math.floor(index / columns) }
      region.push(cell)
      for (const neighbour of neighbours(cell, columns, rows)) {
        if (changed[neighbour] && !seen[neighbour]) {
          seen[neighbour] = true
          waiting.push(neighbour)
        }
      }
    }
    regions.push(region)
  }

  return regions
}

function neighbours({ column, row }: Cell, columns: number, rows: number): number[] {
  const around: number[] = []
  for (let rowStep = -1; rowStep <= 1; rowStep++) {
    for (let columnStep = -1; columnStep <= 1; columnStep++) {
      const neighbourColumn = column + columnStep
      const neighbourRow = row + rowStep
      const inside = neighbourColumn >= 0 && neighbourColumn < columns && neighbourRow >= 0 && neighbourRow < rows
      if (inside && (rowStep !== 0 || columnStep !== 0)) around.push(neighbourRow * columns + neighbourColumn)
    }
  }
  return around
}

function boundsOf(cells: Cell[]): Mark {
  const left = Math.min(...cells.map((cell) => cell.column)) * cellSize
  const top = Math.min(...cells.map((cell) => cell.row)) * cellSize
  const right = (Math.max(...cells.map((cell) => cell.column)) + 1) * cellSize
  const bottom = (Math.max(...cells.map((cell) => cell.row)) + 1) * cellSize
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function mergeNearby(marks: Mark[]): Mark[] {
  const merged = [...marks]

  for (let index = 0; index < merged.length; index++) {
    const other = merged.findIndex((candidate, at) => at !== index && areNear(merged[index]!, candidate))
    if (other === -1) continue

    merged[index] = union(merged[index]!, merged[other]!)
    merged.splice(other, 1)
    index = -1
  }

  return merged
}

function areNear(one: Mark, other: Mark): boolean {
  return (
    one.x - nearby < other.x + other.width &&
    other.x - nearby < one.x + one.width &&
    one.y - nearby < other.y + other.height &&
    other.y - nearby < one.y + one.height
  )
}

function union(one: Mark, other: Mark): Mark {
  const x = Math.min(one.x, other.x)
  const y = Math.min(one.y, other.y)
  const right = Math.max(one.x + one.width, other.x + other.width)
  const bottom = Math.max(one.y + one.height, other.y + other.height)
  return { x, y, width: right - x, height: bottom - y }
}

function clip(mark: Mark, picture: Decoded): Mark {
  const right = Math.min(mark.x + mark.width, picture.width)
  const bottom = Math.min(mark.y + mark.height, picture.height)
  return { x: mark.x, y: mark.y, width: right - mark.x, height: bottom - mark.y }
}
