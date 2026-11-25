export type Pair<Item> = { base?: Item; head?: Item }

export function pairByKey<Item>(base: Item[], head: Item[], keyOf: (item: Item) => string): Pair<Item>[] {
  const baseByKey = new Map(base.map((item) => [keyOf(item), item]))
  const headKeys = new Set(head.map(keyOf))
  const pairs = head.map((item): Pair<Item> => {
    const before = baseByKey.get(keyOf(item))
    return before === undefined ? { head: item } : { base: before, head: item }
  })

  for (const [index, item] of base.entries()) {
    if (headKeys.has(keyOf(item))) continue

    const previous = base[index - 1]
    const after = previous === undefined ? -1 : pairs.findIndex((pair) => pair.base === previous)
    pairs.splice(after + 1, 0, { base: item })
  }

  return pairs
}
