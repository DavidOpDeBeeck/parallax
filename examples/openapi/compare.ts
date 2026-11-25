import type { Status } from "../design/style.ts"
import { type Pair, pairByKey } from "../tools/pair-by-key.ts"
import type { Card, Cards, Marker, Relation, Row } from "./cards/card.ts"
import type { OpenApiSnapshot } from "./extract.ts"
import { type Item, type ItemRow, itemsOf } from "./items.ts"

type ComparedCard = { card: Card; rows: ComparedRow[] }

type ComparedRow = { row: Row; uses: string[]; usesLabel: string }

export function compareOpenApi(base: OpenApiSnapshot, head: OpenApiSnapshot): Cards | undefined {
  const compared = pairByKey(itemsOf(base), itemsOf(head), (item) => item.id).map(compareItem)
  const changedIds = new Set(compared.filter(({ card }) => card.status !== "unchanged").map(({ card }) => card.id))
  if (changedIds.size === 0) return undefined

  const shown = compared.flatMap((entry) => shownPart(entry, changedIds))
  const cards = shown.map(({ card }) => card)
  return { cards, relations: relationsBetween(shown) }
}

function compareItem(pair: Pair<Item>): ComparedCard {
  const { base, head } = pair
  const item = (head ?? base)!
  const inBoth = base !== undefined && head !== undefined
  const rowPairs = pairByKey(base?.rows ?? [], head?.rows ?? [], (row) => row.id)
  const rows = rowPairs.map((rowPair) => compareRow(rowPair, inBoth))
  const status = itemStatus(pair, rows)
  const card: Card = { id: item.id, label: item.label, kind: item.kind, status, rows: rows.map(({ row }) => row) }

  if (status === "removed" && item.breaksWhenRemoved !== undefined) {
    card.markers = [{ label: "breaking", reason: item.breaksWhenRemoved }]
  }
  return { card, rows }
}

function itemStatus({ base, head }: Pair<Item>, rows: ComparedRow[]): Status {
  if (base === undefined) return "new"
  if (head === undefined) return "removed"
  return rows.some(({ row }) => row.status !== "unchanged") ? "changed" : "unchanged"
}

// A row is only marked breaking on an item both commits have: a new or removed item says so once, itself.
function compareRow(pair: Pair<ItemRow>, inBoth: boolean): ComparedRow {
  const { base, head } = pair
  const itemRow = (head ?? base)!
  const status = rowStatus(pair)
  const marker = inBoth ? breakingMarker(status, itemRow) : undefined
  const row: Row = { id: itemRow.id, label: itemRow.label, status }

  if (itemRow.value !== undefined) row.value = itemRow.value
  if (status === "changed" && base?.value !== undefined && head?.value !== undefined) row.before = base.value
  if (marker !== undefined) row.markers = [marker]
  return { row, uses: itemRow.uses, usesLabel: itemRow.usesLabel }
}

function rowStatus({ base, head }: Pair<ItemRow>): Status {
  if (base === undefined) return "new"
  if (head === undefined) return "removed"
  return base.value === head.value ? "unchanged" : "changed"
}

function breakingMarker(status: Status, row: ItemRow): Marker | undefined {
  if (status === "new" && row.breaksWhenAdded !== undefined) return { label: "breaking", reason: row.breaksWhenAdded }
  if (status === "removed" && row.breaksWhenRemoved !== undefined) {
    return { label: "breaking", reason: row.breaksWhenRemoved }
  }
  return undefined
}

function shownPart({ card, rows }: ComparedCard, changedIds: Set<string>): ComparedCard[] {
  if (card.status !== "unchanged") return [{ card, rows }]

  const usingRows = rows.filter(({ uses }) => uses.some((id) => changedIds.has(id)))
  if (usingRows.length === 0) return []
  return [{ card: { ...card, rows: usingRows.map(({ row }) => row) }, rows: usingRows }]
}

function relationsBetween(shown: ComparedCard[]): Relation[] {
  const shownIds = new Set(shown.map(({ card }) => card.id))

  return shown.flatMap(({ rows }) =>
    rows.flatMap(({ row, uses, usesLabel }) =>
      [...new Set(uses)].filter((id) => shownIds.has(id)).map((to) => ({ from: row.id, to, label: usesLabel })),
    ),
  )
}
