import type { Change } from "./change.ts"

export type { Change } from "./change.ts"

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

export type View = { title: string; html: string }

export type Extension<Snapshot extends Json, Delta extends Json> =
  | SnapshotExtension<Snapshot, Delta>
  | CommitsExtension<Delta>

export type SnapshotExtension<Snapshot extends Json, Delta extends Json> = {
  name: string
  extract(checkout: string): Promise<Snapshot>
  compare(base: Snapshot, head: Snapshot): Delta | undefined
  show(delta: Delta): View[]
}

export type CommitsExtension<Delta extends Json> = {
  name: string
  compareCommits(change: Change): Promise<Delta | undefined>
  show(delta: Delta): View[]
}

export type Config = { extensions: Extension<Json, Json>[] }
