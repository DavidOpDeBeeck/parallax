import type { Status } from "../../design/style.ts"

export type Cards = {
  cards: Card[]
  relations?: Relation[]
}

export type Card = {
  id: string
  label: string
  kind: string
  status: Status
  rows: Row[]
  markers?: Marker[]
}

export type Row = {
  id: string
  label: string
  status: Status
  value?: string
  before?: string
  markers?: Marker[]
}

export type Relation = {
  from: string
  to: string
  label?: string
}

export type Marker = {
  label: string
  reason: string
}
