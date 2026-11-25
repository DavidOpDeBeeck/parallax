import type { Card, Relation } from "./card.ts"

export type Branch = {
  card: number
  depth: number
  hangsBy: Relation[]
  uses: Use[]
}

export type Use = { card: number; relations: Relation[] }

export type Tree = Branch[]

export function planTrees({ cards, relations = [] }: { cards: Card[]; relations?: Relation[] }): Tree[] {
  const cardOf = cardIndexById(cards)
  const links = relations.map((relation) => ({
    relation,
    from: cardOf.get(relation.from)!,
    to: cardOf.get(relation.to)!,
  }))
  const used = new Set(links.filter(({ from, to }) => from !== to).map(({ to }) => to))
  const placed = new Set<number>()
  const trees: Tree[] = []

  const relationsBetween = (from: number, to: number) =>
    links.filter((link) => link.from === from && link.to === to).map((link) => link.relation)
  const grow = (tree: Tree, card: number, depth: number, hangsBy: Relation[]) => {
    placed.add(card)
    const targets = [...new Set(links.filter((link) => link.from === card && link.to !== card).map((link) => link.to))]
    const branch: Branch = { card, depth, hangsBy, uses: [] }
    tree.push(branch)
    for (const target of targets) {
      if (placed.has(target)) branch.uses.push({ card: target, relations: relationsBetween(card, target) })
      else grow(tree, target, depth + 1, relationsBetween(card, target))
    }
  }

  const indexes = cards.map((_, index) => index)
  for (const card of [...indexes.filter((card) => !used.has(card)), ...indexes]) {
    if (placed.has(card)) continue
    const tree: Tree = []
    grow(tree, card, 0, [])
    trees.push(tree)
  }
  return trees
}

function cardIndexById(cards: Card[]): Map<string, number> {
  return new Map(
    cards.flatMap((card, index) => [[card.id, index] as const, ...card.rows.map((row) => [row.id, index] as const)]),
  )
}
