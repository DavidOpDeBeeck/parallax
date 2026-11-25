import type { Status } from "../../design/style.ts"

export type Screens = {
  screens: Screen[]
}

export type Screen = {
  name: string
  status: Status
  picture?: Picture
  marks?: Mark[]
}

export type Picture = { png: string; width: number; height: number }

export type Mark = { x: number; y: number; width: number; height: number }
