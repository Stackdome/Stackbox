import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { load } from 'js-yaml'
import { PRUNED_GROUPS } from './transform.ts'

const doc = load(
  readFileSync(resolve(__dirname, '../openapi/stackbox_api.yaml'), 'utf8'),
) as { paths: Record<string, unknown>; components: { schemas: Record<string, unknown> } }

const SOURCE = '/Users/akshaysasidharan/code/stackdome/config/openapi/stackdome_api.yaml'
const rawSource = readFileSync(SOURCE, 'utf8')
const rawOut = readFileSync(resolve(__dirname, '../openapi/stackbox_api.yaml'), 'utf8')

const paths = Object.keys(doc.paths)
const schemas = Object.keys(doc.components.schemas)
const PRUNED = PRUNED_GROUPS
const countEnumBlocks = (yaml: string) => (yaml.match(/x-enum-varnames/g) ?? []).length

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
})
