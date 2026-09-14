import { ServiceKind } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { DEMO_STACKFILE } from '../../ports/fakes'
import { parseStackfile, serviceKindOf, stackfileOutcome } from './stackfile'

const lines = (...rows: string[]) => [...rows, ''].join('\n')

describe('parseStackfile', () => {
  it('reads each service of the demo Stackfile with its path, image and port', () => {
    expect(parseStackfile(DEMO_STACKFILE)).toEqual({
      services: [
        { name: 'api', path: 'apps/api', image: null, port: 3000 },
        { name: 'web', path: 'apps/web', image: null, port: 5173 },
        { name: 'postgres', path: null, image: 'postgres:17', port: null },
      ],
    })
  })

  it('refuses a document with no services map', () => {
    expect(parseStackfile(lines('name: shop'))).toEqual({ error: 'services: expected a map of service names' })
  })

  it('names the service that has neither a path nor an image', () => {
    expect(parseStackfile(lines('services:', '  worker: { port: 9000 }'))).toEqual({ error: 'services.worker: needs a path or an image' })
  })

  it('names the key of a path that is not a string', () => {
    expect(parseStackfile(lines('services:', '  api: { path: [apps, api] }'))).toEqual({ error: 'services.api.path: expected a string' })
  })

  it('names the key of a port that is not a port number', () => {
    expect(parseStackfile(lines('services:', '  api: { path: apps/api, port: http }'))).toEqual({
      error: 'services.api.port: expected a port number from 1 to 65535',
    })
  })

  it('refuses a Stackfile that declares no services', () => {
    expect(parseStackfile(lines('services: {}'))).toEqual({ error: 'services: declare at least one service' })
  })

  it('reports YAML that does not parse', () => {
    const parsed = parseStackfile(lines('services:', '  api: { path: apps/api'))

    expect('error' in parsed && parsed.error.startsWith('Stackfile is not valid YAML: ')).toBe(true)
  })
})

describe('stackfileOutcome', () => {
  it('says where it looked when the Stackfile is missing', () => {
    expect(stackfileOutcome('admin/stackfile.yaml', null)).toEqual({ error: 'Stackfile not found at admin/stackfile.yaml' })
  })
})

describe('serviceKindOf', () => {
  it('reads source when the service has a path, even beside an image, and image otherwise', () => {
    expect([serviceKindOf({ path: 'apps/api' }), serviceKindOf({ path: null })]).toEqual([ServiceKind.Source, ServiceKind.Image])
  })
})
