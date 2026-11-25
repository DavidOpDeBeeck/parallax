/** @jsxImportSource preact */
import { Counts } from "../design/counts.tsx"
import { renderPage } from "../design/page.tsx"
import type { ChangedFile, CodeDelta } from "./code.ts"
import { buildTree, type MapNode } from "./file-tree.ts"
import { type Box, squarify } from "./squarify.ts"

// As wide as the page leaves inside its padding.
const mapWidth = 832
const minMapHeight = 240
const maxMapHeight = 640
const mapHeightPerTile = 40
const groupLabelHeight = 18
const groupPadding = 4
const tileGap = 1

const css = `
.map { position: relative; width: ${mapWidth}px; }
.group, .tile { position: absolute; overflow: hidden; border-radius: 3px; }
.group { border: 1px solid var(--line); }
.group > .name { position: absolute; top: 1px; left: 5px; right: 5px; color: var(--muted); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tile { padding: 2px 5px; border: 1px solid; font-size: 11px; line-height: 15px; }
.tile .name, .tile .lines { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tile.new { background: var(--new-tint); border-color: var(--new); }
.tile.changed { background: var(--changed-tint); border-color: var(--changed); }
.tile.removed { background: var(--removed-tint); border-color: var(--removed); }
.tile.unchanged { background: var(--unchanged-tint); border-color: var(--unchanged); }
.tile .name { color: var(--ink); }
.tile.removed .name { color: var(--muted); text-decoration: line-through; }
`

export function codePage({ files }: CodeDelta): string {
  const nodes = buildTree(files).children
  const height = Math.min(maxMapHeight, Math.max(minMapHeight, mapHeightPerTile * files.length))

  return renderPage(
    css,
    <>
      <Counts statuses={files.map((file) => file.status)} facts={facts(files)} />
      <div class="map" style={`height:${height}px`}>
        <Areas nodes={nodes} box={{ x: 0, y: 0, width: mapWidth, height }} />
      </div>
    </>,
  )
}

function Areas({ nodes, box }: { nodes: MapNode[]; box: Box }) {
  return (
    <>
      {squarify(nodes, (node) => node.weight, box).map(({ item, box: placed }) =>
        item.kind === "folder" ? <Group node={item} box={placed} /> : <Tile node={item} box={placed} />,
      )}
    </>
  )
}

function Group({ node, box }: { node: Extract<MapNode, { kind: "folder" }>; box: Box }) {
  const inner = {
    x: box.x + groupPadding,
    y: box.y + groupLabelHeight,
    width: box.width - groupPadding * 2,
    height: box.height - groupLabelHeight - groupPadding,
  }
  return (
    <>
      <div class="group" style={position(box)}>
        <span class="name mono">{`${node.name}/`}</span>
      </div>
      <Areas nodes={node.children} box={inner} />
    </>
  )
}

function Tile({ node, box }: { node: Extract<MapNode, { kind: "file" }>; box: Box }) {
  const { file } = node
  const area = {
    x: box.x + tileGap,
    y: box.y + tileGap,
    width: box.width - tileGap * 2,
    height: box.height - tileGap * 2,
  }
  if (area.width <= 0 || area.height <= 0) return null

  return (
    <div class={`tile ${file.status}`} style={position(area)} title={hint(file)}>
      <div class="name mono">{node.name}</div>
      <div class="lines mono">
        {file.added > 0 && <span class="new">{`+${file.added} `}</span>}
        {file.removed > 0 && <span class="removed">{`−${file.removed}`}</span>}
        {file.added + file.removed === 0 && file.movedFrom !== undefined && <span class="muted">moved</span>}
      </div>
    </div>
  )
}

function position({ x, y, width, height }: Box): string {
  const round = (value: number) => Math.round(value * 10) / 10
  return `left:${round(x)}px;top:${round(y)}px;width:${round(width)}px;height:${round(height)}px`
}

function facts(files: ChangedFile[]): string[] {
  const moved = files.filter((file) => file.movedFrom !== undefined).length
  const added = files.reduce((total, file) => total + file.added, 0)
  const removed = files.reduce((total, file) => total + file.removed, 0)
  return [...(moved > 0 ? [`${moved} moved`] : []), `+${added} −${removed} lines`]
}

function hint(file: ChangedFile): string {
  const status = file.movedFrom !== undefined && file.status === "unchanged" ? "moved" : file.status
  const lines = `${file.path}\n${status}, +${file.added} −${file.removed}`
  return file.movedFrom === undefined ? lines : `${lines}\nmoved from ${file.movedFrom}`
}
