import { join } from "node:path"

import type { SnapshotExtension } from "parallax"
import type { Cards } from "./cards/card.ts"
import { cardsPage } from "./cards/cards.tsx"
import { compareOpenApi } from "./compare.ts"
import type { OpenApiSnapshot } from "./extract.ts"
import { extractOpenApi } from "./extract.ts"

const document = "examples/openapi/tickets.yaml"

const noApi: OpenApiSnapshot = { endpoints: [], schemas: [] }

export function openapi(): SnapshotExtension<OpenApiSnapshot | null, Cards> {
  return {
    name: "api",
    extract: (checkout) => extractOpenApi(join(checkout, document)),
    compare: (base, head) => {
      if (base === null && head === null) {
        throw new Error(`there is no OpenAPI document at ${document} at either commit`)
      }
      return compareOpenApi(base ?? noApi, head ?? noApi)
    },
    show: (cards) => [{ title: "API", html: cardsPage(cards) }],
  }
}
