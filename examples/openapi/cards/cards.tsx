/** @jsxImportSource preact */
import { Counts } from "../../design/counts.tsx"
import { renderPage } from "../../design/page.tsx"
import type { Status } from "../../design/style.ts"
import { statusSigns } from "../../design/style.ts"
import type { Card, Cards, Marker, Relation, Row } from "./card.ts"
import { type Branch, planTrees } from "./card-trees.ts"

const css = `
.tree + .tree { margin-top: 24px; }
.card { width: fit-content; min-width: 320px; max-width: 100%; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
.card > header { display: flex; gap: 24px; justify-content: space-between; padding: 6px 10px; background: var(--band); border-bottom: 1px solid var(--line); }
.card.new > header { background: var(--new-tint); }
.card.removed > header { background: var(--removed-tint); }
.card > header .title { font-weight: 600; }
.card > .marker-note { margin: 8px 10px; }
.rows { display: grid; grid-template-columns: 24px max-content 1fr; padding: 4px 0; }
.row { display: contents; }
.row > * { padding: 2px 12px 2px 0; }
.row > .sign { text-align: center; }
.row.new > * { background: var(--new-tint); }
.row.removed > * { background: var(--removed-tint); }
.row.unchanged .value { color: var(--muted); }
.row .value { padding-right: 10px; overflow-wrap: anywhere; }
.row-markers { grid-column: 2 / -1; padding: 0 10px 4px 0; }
.branch.hanging { margin-left: 20px; padding-left: 16px; border-left: 1px solid var(--line); }
.branch.hanging.new { border-left-color: var(--new); }
.branch.hanging.removed { border-left-color: var(--removed); }
.caption { margin: 12px 0 6px; color: var(--muted); }
.named { margin: 8px 0 0 20px; color: var(--muted); }
`

export function cardsPage({ cards, relations = [] }: Cards): string {
  const trees = planTrees({ cards, relations })
  const order = new Map(trees.flat().map((branch, position) => [branch.card, position]))
  const labels = new Map(cards.flatMap((card) => card.rows.map((row) => [row.id, row.label] as const)))
  const statuses = new Map(cards.flatMap((card) => card.rows.map((row) => [row.id, row.status] as const)))
  const context: Context = { cards, labels, statuses, order }
  const markers = cards.flatMap((card) => [...(card.markers ?? []), ...card.rows.flatMap((row) => row.markers ?? [])])

  return renderPage(
    css,
    <>
      <Counts statuses={cards.map((card) => card.status)} markers={markers.map((marker) => marker.label)} />
      {trees.map((tree) => (
        <div class="tree">
          <CardBranch branch={tree[0]!} under={tree.slice(1)} context={context} />
        </div>
      ))}
    </>,
  )
}

type Context = {
  cards: Card[]
  labels: Map<string, string>
  statuses: Map<string, Status>
  order: Map<number, number>
}

function CardBranch({ branch, under, context }: { branch: Branch; under: Branch[]; context: Context }) {
  const card = context.cards[branch.card]!
  const hangs = branch.hangsBy.length > 0
  const lineStatus = context.statuses.get(branch.hangsBy[0]?.from ?? "") ?? "unchanged"

  return (
    <div class={hangs ? `branch hanging ${lineStatus}` : "branch"}>
      {hangs && (
        <p class="caption">
          <Prose text={captionOf(branch.hangsBy, context.labels)} />
        </p>
      )}
      <CardSection card={card} />
      {branch.uses.map((use) => (
        <p class="named">
          <Prose
            text={`${captionOf(use.relations, context.labels)} \`${context.cards[use.card]!.label}\`, ${where(context.order, branch.card, use.card)}`}
          />
        </p>
      ))}
      {childrenOf(branch, under).map(({ child, rest }) => (
        <CardBranch branch={child} under={rest} context={context} />
      ))}
    </div>
  )
}

function CardSection({ card }: { card: Card }) {
  const kind = card.status === "unchanged" ? card.kind : `${card.status} ${card.kind}`
  return (
    <article class={`card ${card.status}`}>
      <header>
        <code class="title">{card.label}</code>
        <span class={card.status}>{kind}</span>
      </header>
      <Markers markers={card.markers ?? []} />
      <div class="rows">
        {card.rows.map((row) => (
          <CardRow row={row} />
        ))}
      </div>
    </article>
  )
}

function CardRow({ row }: { row: Row }) {
  const changed = row.status === "changed" && row.before !== undefined && row.value !== undefined
  return (
    <div class={`row ${row.status}`}>
      <span class={`sign ${row.status}`}>{statusSigns[row.status]}</span>
      <code>{row.label}</code>
      {changed ? (
        <span class="value mono">
          <span class="removed">{`− ${row.before}`}</span>
          <br />
          <span class="new">{`+ ${row.value}`}</span>
        </span>
      ) : (
        <span class="value mono">{row.value ?? ""}</span>
      )}
      {(row.markers ?? []).length > 0 && (
        <div class="row-markers">
          <Markers markers={row.markers ?? []} />
        </div>
      )}
    </div>
  )
}

function Markers({ markers }: { markers: Marker[] }) {
  return (
    <>
      {markers.map((marker) => (
        <p class="marker-note">
          <span class="label">{marker.label}</span>
          <Prose text={marker.reason} />
        </p>
      ))}
    </>
  )
}

function childrenOf(branch: Branch, under: Branch[]): { child: Branch; rest: Branch[] }[] {
  const children: { child: Branch; rest: Branch[] }[] = []
  for (const each of under) {
    if (each.depth <= branch.depth) break
    if (each.depth === branch.depth + 1) children.push({ child: each, rest: [] })
    else children.at(-1)!.rest.push(each)
  }
  return children
}

function captionOf(relations: Relation[], labels: Map<string, string>): string {
  const named = relations.flatMap((relation) => {
    const label = labels.get(relation.from)
    return label === undefined ? [] : [`\`${label}\``]
  })
  const listed = named.length > 2 ? `${named[0]} and ${named.length - 1} more` : named.join(", ")
  const meaning = relations[0]?.label ?? "uses"
  return listed === "" ? meaning : `${listed} ${meaning}`
}

function where(order: Map<number, number>, user: number, card: number): string {
  return order.get(card)! < order.get(user)! ? "drawn above" : "drawn below"
}

function Prose({ text }: { text: string }) {
  return <>{text.split("`").map((part, index) => (index % 2 === 1 ? <code>{part}</code> : part))}</>
}
