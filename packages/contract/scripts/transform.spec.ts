import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { load } from 'js-yaml'
import { PRUNED_GROUPS, SCHEMA_RENAME_MAP } from './transform.ts'

const doc = load(
  readFileSync(resolve(__dirname, '../openapi/stackbox_api.yaml'), 'utf8'),
) as { paths: Record<string, Record<string, { operationId?: string }>>; components: { schemas: Record<string, unknown> } }

const SOURCE = '/Users/akshaysasidharan/code/stackdome/config/openapi/stackdome_api.yaml'
const rawSource = readFileSync(SOURCE, 'utf8')
const rawOut = readFileSync(resolve(__dirname, '../openapi/stackbox_api.yaml'), 'utf8')

const paths = Object.keys(doc.paths)
const schemas = Object.keys(doc.components.schemas)
const PRUNED = PRUNED_GROUPS
const countEnumBlocks = (yaml: string) => (yaml.match(/x-enum-varnames/g) ?? []).length

const operationIds = Object.values(doc.paths).flatMap((operations) =>
  Object.values(operations)
    .map((op) => op.operationId)
    .filter((id): id is string => typeof id === 'string'),
)

describe('the transformed contract', () => {
  it('has no path carrying project_name or a /projects/ segment', () => {
    expect(paths.filter((p) => p.includes('project_name') || p.includes('/projects/'))).toEqual([])
  })

  it('has no schema name containing the word Stack', () => {
    expect(schemas.filter((s) => /Stack/.test(s))).toEqual([])
  })

  it('has no path under /stacks', () => {
    expect(paths.filter((p) => p.includes('/stacks'))).toEqual([])
  })

  it('has no path belonging to a pruned group', () => {
    expect(paths.filter((p) => PRUNED.some((g) => p.includes(g)))).toEqual([])
  })

  it('flattens every org_id-scoped path onto the organizations/{org_id}/ prefix', () => {
    // The organizations collection/item paths (/api/v1/organizations,
    // /api/v1/organizations/{id}) and non-org paths don't carry {org_id} at
    // all, so they're outside this check by construction -- flatten only
    // promises this for paths it actually scoped under an org.
    const orgIdScoped = paths.filter((p) => p.includes('{org_id}'))
    expect(orgIdScoped.length).toBeGreaterThan(0)
    expect(
      orgIdScoped.filter((p) => !p.startsWith('/api/v1/organizations/{org_id}/')),
    ).toEqual([])
  })

  it('carries over every x-enum-varnames block the source document had', () => {
    expect(countEnumBlocks(rawOut)).toBe(countEnumBlocks(rawSource))
  })

  it('renames Stack inside every operationId', () => {
    expect(operationIds.filter((id) => /Stack(?!file)/.test(id))).toEqual([])
  })

  it('renames every schema in the rename map', () => {
    for (const [from, to] of Object.entries(SCHEMA_RENAME_MAP)) {
      expect(schemas, `expected ${from} to be renamed away`).not.toContain(from)
      expect(schemas, `expected ${to} to be present`).toContain(to)
    }
  })
})
