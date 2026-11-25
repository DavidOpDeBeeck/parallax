import { readFile } from "node:fs/promises"

import { parse as parseYaml } from "yaml"

export type OpenApiSnapshot = { endpoints: Endpoint[]; schemas: NamedSchema[] }

export type Endpoint = {
  method: string
  path: string
  parameters: Parameter[]
  body?: Body
  responses: Response[]
}

export type Parameter = { name: string; in: string; required: boolean; schema: Schema }

export type Body = { required: boolean; schema?: Schema }

export type Response = { status: string; schema?: Schema }

export type NamedSchema = { name: string; schema: Schema }

export type Schema = {
  ref?: string
  type?: string
  format?: string
  nullable?: boolean
  enum?: string[]
  items?: Schema
  properties?: Property[]
}

export type Property = { name: string; required: boolean; schema: Schema }

export async function extractOpenApi(file: string): Promise<OpenApiSnapshot | null> {
  try {
    const text = await readFile(file, "utf8")
    return parseOpenApi(parseYaml(text))
  } catch (cause) {
    if (isMissingFile(cause)) return null
    throw new Error(`reading the OpenAPI document ${file} failed`, { cause })
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT"
}

const methods = ["get", "put", "post", "delete", "patch", "head", "options", "trace"]

function parseOpenApi(document: unknown): OpenApiSnapshot {
  const root = requireObject(document, "the document")
  const paths = optionalObject(root.paths, "paths")
  const components = optionalObject(root.components, "components")
  const schemas = optionalObject(components.schemas, "components.schemas")

  return {
    endpoints: Object.entries(paths).flatMap(([path, item]) => parsePathItem(path, item)),
    schemas: Object.entries(schemas).map(([name, schema]) => ({
      name,
      schema: parseSchema(schema, `components.schemas.${name}`),
    })),
  }
}

function parsePathItem(path: string, value: unknown): Endpoint[] {
  const at = `paths.${path}`
  const item = requireObject(value, at)
  const sharedParameters = parseParameters(item.parameters, `${at}.parameters`)

  return methods
    .filter((method) => item[method] !== undefined)
    .map((method) => parseOperation(path, method, item[method], sharedParameters))
}

function parseOperation(path: string, method: string, value: unknown, sharedParameters: Parameter[]): Endpoint {
  const at = `paths.${path}.${method}`
  const operation = requireObject(value, at)
  const ownParameters = parseParameters(operation.parameters, `${at}.parameters`)
  const inherited = sharedParameters.filter(
    (shared) => !ownParameters.some((own) => own.name === shared.name && own.in === shared.in),
  )
  const endpoint: Endpoint = {
    method: method.toUpperCase(),
    path,
    parameters: [...inherited, ...ownParameters],
    responses: parseResponses(operation.responses, `${at}.responses`),
  }

  if (operation.requestBody !== undefined) {
    endpoint.body = parseBody(operation.requestBody, `${at}.requestBody`)
  }
  return endpoint
}

function parseParameters(value: unknown, at: string): Parameter[] {
  if (value === undefined) return []

  return requireArray(value, at).map((entry, index) => {
    const parameterAt = `${at}[${index}]`
    const parameter = requireObject(entry, parameterAt)
    if (parameter.$ref !== undefined) {
      throw new Error(`${parameterAt} is a $ref; only schemas may be given by $ref here`)
    }

    const location = requireString(parameter.in, `${parameterAt}.in`)
    return {
      name: requireString(parameter.name, `${parameterAt}.name`),
      in: location,
      required: location === "path" || optionalBoolean(parameter.required, `${parameterAt}.required`),
      schema: parameter.schema === undefined ? {} : parseSchema(parameter.schema, `${parameterAt}.schema`),
    }
  })
}

function parseBody(value: unknown, at: string): Body {
  const body = requireObject(value, at)
  const schema = parseContentSchema(body.content, `${at}.content`)
  const required = optionalBoolean(body.required, `${at}.required`)

  return schema === undefined ? { required } : { required, schema }
}

function parseResponses(value: unknown, at: string): Response[] {
  return Object.entries(optionalObject(value, at)).map(([status, entry]) => {
    const response = requireObject(entry, `${at}.${status}`)
    const schema = parseContentSchema(response.content, `${at}.${status}.content`)
    return schema === undefined ? { status } : { status, schema }
  })
}

function parseContentSchema(value: unknown, at: string): Schema | undefined {
  if (value === undefined) return undefined

  const content = requireObject(value, at)
  const mediaType = "application/json" in content ? "application/json" : Object.keys(content)[0]
  if (mediaType === undefined) return undefined

  const media = requireObject(content[mediaType], `${at}.${mediaType}`)
  return media.schema === undefined ? undefined : parseSchema(media.schema, `${at}.${mediaType}.schema`)
}

function parseSchema(value: unknown, at: string): Schema {
  const fields = requireObject(value, at)
  const schema: Schema = {}

  if (fields.$ref !== undefined) schema.ref = requireString(fields.$ref, `${at}.$ref`).split("/").at(-1) ?? ""
  if (fields.type !== undefined) schema.type = requireString(fields.type, `${at}.type`)
  if (fields.format !== undefined) schema.format = requireString(fields.format, `${at}.format`)
  if (fields.nullable !== undefined) schema.nullable = optionalBoolean(fields.nullable, `${at}.nullable`)
  if (fields.enum !== undefined) schema.enum = requireArray(fields.enum, `${at}.enum`).map(String)
  if (fields.items !== undefined) schema.items = parseSchema(fields.items, `${at}.items`)
  if (fields.properties !== undefined) schema.properties = parseProperties(fields, at)
  return schema
}

function parseProperties(fields: Fields, at: string): Property[] {
  const required = fields.required === undefined ? [] : requireArray(fields.required, `${at}.required`)

  return Object.entries(requireObject(fields.properties, `${at}.properties`)).map(([name, schema]) => ({
    name,
    required: required.includes(name),
    schema: parseSchema(schema, `${at}.properties.${name}`),
  }))
}

type Fields = Record<string, unknown>

function requireObject(value: unknown, at: string): Fields {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${at} must be an object; got ${describe(value)}`)
  }
  return value as Fields
}

function optionalObject(value: unknown, at: string): Fields {
  return value === undefined ? {} : requireObject(value, at)
}

function requireArray(value: unknown, at: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${at} must be a list; got ${describe(value)}`)
  return value
}

function requireString(value: unknown, at: string): string {
  if (typeof value !== "string") throw new Error(`${at} must be text; got ${describe(value)}`)
  return value
}

function optionalBoolean(value: unknown, at: string): boolean {
  if (value === undefined) return false
  if (typeof value !== "boolean") throw new Error(`${at} must be true or false; got ${describe(value)}`)
  return value
}

function describe(value: unknown): string {
  if (value === undefined) return "nothing"
  if (value === null) return "null"
  if (Array.isArray(value)) return "a list"
  if (typeof value === "object") return "an object"
  return JSON.stringify(value)
}
