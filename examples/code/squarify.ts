export type Box = { x: number; y: number; width: number; height: number }

export type Placed<Item> = { item: Item; box: Box }

// Bruls, Huizing and van Wijk's squarified treemap: rows as close to square as they get, heaviest first.
export function squarify<Item>(items: Item[], weightOf: (item: Item) => number, box: Box): Placed<Item>[] {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0)
  if (total <= 0 || box.width <= 0 || box.height <= 0) return []

  const scale = (box.width * box.height) / total
  const areaOf = (item: Item) => weightOf(item) * scale
  const placed: Placed<Item>[] = []
  let remaining = box
  let row: Item[] = []

  for (const item of items) {
    const side = Math.min(remaining.width, remaining.height)
    if (row.length === 0 || worstRatio([...row, item], areaOf, side) <= worstRatio(row, areaOf, side)) {
      row.push(item)
      continue
    }

    const laid = layOutRow(row, areaOf, remaining)
    placed.push(...laid.placed)
    remaining = laid.remaining
    row = [item]
  }

  placed.push(...layOutRow(row, areaOf, remaining).placed)
  return placed
}

function worstRatio<Item>(row: Item[], areaOf: (item: Item) => number, side: number): number {
  const areas = row.map(areaOf)
  const rowArea = areas.reduce((sum, area) => sum + area, 0)

  return Math.max(
    ...areas.map((area) =>
      Math.max((side * side * area) / (rowArea * rowArea), (rowArea * rowArea) / (side * side * area)),
    ),
  )
}

function layOutRow<Item>(
  row: Item[],
  areaOf: (item: Item) => number,
  box: Box,
): { placed: Placed<Item>[]; remaining: Box } {
  const rowArea = row.reduce((sum, item) => sum + areaOf(item), 0)
  const placed: Placed<Item>[] = []

  if (box.width >= box.height) {
    const width = rowArea / box.height
    let y = box.y
    for (const item of row) {
      const height = areaOf(item) / width
      placed.push({ item, box: { x: box.x, y, width, height } })
      y += height
    }
    return { placed, remaining: { x: box.x + width, y: box.y, width: box.width - width, height: box.height } }
  }

  const height = rowArea / box.width
  let x = box.x
  for (const item of row) {
    const width = areaOf(item) / height
    placed.push({ item, box: { x, y: box.y, width, height } })
    x += width
  }
  return { placed, remaining: { x: box.x, y: box.y + height, width: box.width, height: box.height - height } }
}
