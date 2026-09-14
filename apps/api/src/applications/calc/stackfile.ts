import { ServiceKind } from '@stackbox/contract'
import { load } from 'js-yaml'

export const DEFAULT_STACKFILE_PATH = 'stackfile.yaml'

const MAX_PORT = 65535

export type StackfileService = { name: string; path: string | null; image: string | null; port: number | null }

export type ParsedStackfile = { services: StackfileService[] } | { error: string }

type Refusal = { error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function textAt(key: string, value: unknown): string | null | Refusal {
  if (value === undefined || value === null) return null
  return typeof value === 'string' ? value : { error: `${key}: expected a string` }
}

function portAt(key: string, value: unknown): number | null | Refusal {
  if (value === undefined || value === null) return null
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_PORT
    ? value
    : { error: `${key}: expected a port number from 1 to ${MAX_PORT}` }
}

function isRefusal(value: unknown): value is Refusal {
  return isRecord(value) && typeof value.error === 'string'
}

function serviceOf(name: string, entry: unknown): StackfileService | Refusal {
  const key = `services.${name}`
  if (!isRecord(entry)) return { error: `${key}: expected a map with a path or an image` }
  const path = textAt(`${key}.path`, entry.path)
  if (isRefusal(path)) return path
  const image = textAt(`${key}.image`, entry.image)
  if (isRefusal(image)) return image
  if (path === null && image === null) return { error: `${key}: needs a path or an image` }
  const port = portAt(`${key}.port`, entry.port)
  if (isRefusal(port)) return port
  return { name, path, image, port }
}

export function parseStackfile(text: string): ParsedStackfile {
  let document: unknown
  try {
    document = load(text)
  } catch (error: unknown) {
    return { error: `Stackfile is not valid YAML: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}` }
  }
  if (!isRecord(document) || !isRecord(document.services)) {
    return { error: 'services: expected a map of service names' }
  }
  const services: StackfileService[] = []
  for (const [name, entry] of Object.entries(document.services)) {
    const service = serviceOf(name, entry)
    if (isRefusal(service)) return service
    services.push(service)
  }
  return services.length === 0 ? { error: 'services: declare at least one service' } : { services }
}

export function stackfileOutcome(path: string, text: string | null): ParsedStackfile {
  return text === null ? { error: `Stackfile not found at ${path}` } : parseStackfile(text)
}

// R2: a path wins over an image when a service declares both.
export function serviceKindOf(service: { path: string | null }): ServiceKind {
  return service.path === null ? ServiceKind.Image : ServiceKind.Source
}
