import type { Body, Endpoint, NamedSchema, OpenApiSnapshot, Parameter, Property, Response, Schema } from "./extract.ts"

export type Item = {
  id: string
  label: string
  kind: "endpoint" | "schema"
  rows: ItemRow[]
  breaksWhenRemoved?: string
}

export type ItemRow = {
  id: string
  label: string
  value?: string
  uses: string[]
  usesLabel: string
  breaksWhenAdded?: string
  breaksWhenRemoved?: string
}

export function itemsOf(snapshot: OpenApiSnapshot): Item[] {
  return [...snapshot.endpoints.map(endpointItem), ...snapshot.schemas.map(schemaItem)]
}

export function schemaId(name: string): string {
  return `schema ${name}`
}

function endpointItem(endpoint: Endpoint): Item {
  const id = `${endpoint.method} ${endpoint.path}`
  const bodyRows = endpoint.body === undefined ? [] : [bodyRow(id, endpoint.body)]
  const rows = [
    ...endpoint.parameters.map((parameter) => parameterRow(id, parameter)),
    ...bodyRows,
    ...endpoint.responses.map((response) => responseRow(id, response)),
  ]

  return { id, label: id, kind: "endpoint", rows, breaksWhenRemoved: "clients that call it fail" }
}

function parameterRow(endpointId: string, parameter: Parameter): ItemRow {
  const mustBeSent = parameter.required && parameter.in !== "path"
  const flags = mustBeSent ? [parameter.in, "required"] : [parameter.in]
  const row: ItemRow = {
    id: `${endpointId} ${parameter.in} ${parameter.name}`,
    label: parameter.name,
    value: [typeText(parameter.schema), ...flags].join(", "),
    uses: schemaRefs(parameter.schema).map(schemaId),
    usesLabel: "takes",
  }

  if (mustBeSent) row.breaksWhenAdded = `clients must now send \`${parameter.name}\``
  return row
}

function bodyRow(endpointId: string, body: Body): ItemRow {
  const type = body.schema === undefined ? "any" : typeText(body.schema)
  const row: ItemRow = {
    id: `${endpointId} body`,
    label: "body",
    value: body.required ? `${type}, required` : type,
    uses: body.schema === undefined ? [] : schemaRefs(body.schema).map(schemaId),
    usesLabel: "takes",
  }

  if (body.required) row.breaksWhenAdded = "clients must now send a body"
  return row
}

function responseRow(endpointId: string, response: Response): ItemRow {
  const row: ItemRow = {
    id: `${endpointId} ${response.status}`,
    label: response.status,
    uses: response.schema === undefined ? [] : schemaRefs(response.schema).map(schemaId),
    usesLabel: "returns",
  }

  if (response.schema !== undefined) row.value = typeText(response.schema)
  return row
}

function schemaItem({ name, schema }: NamedSchema): Item {
  const id = schemaId(name)
  const rows = (schema.properties ?? []).map((property) => propertyRow(id, property))

  return { id, label: name, kind: "schema", rows }
}

function propertyRow(schemaItemId: string, property: Property): ItemRow {
  const type = typeText(property.schema)

  return {
    id: `${schemaItemId}.${property.name}`,
    label: property.name,
    value: property.required ? `${type}, required` : type,
    uses: schemaRefs(property.schema).map(schemaId),
    usesLabel: "has",
    breaksWhenRemoved: `clients that read \`${property.name}\` no longer get it`,
  }
}

export function typeText(schema: Schema): string {
  const text = plainTypeText(schema)
  return schema.nullable ? `${text} | null` : text
}

export function schemaRefs(schema: Schema): string[] {
  if (schema.ref !== undefined) return [schema.ref]
  if (schema.items !== undefined) return schemaRefs(schema.items)
  return []
}

function plainTypeText(schema: Schema): string {
  if (schema.ref !== undefined) return schema.ref
  if (schema.enum !== undefined) return schema.enum.join(" | ")
  if (schema.type === "array") return `${schema.items === undefined ? "unknown" : typeText(schema.items)}[]`
  return schema.format ?? schema.type ?? "object"
}
