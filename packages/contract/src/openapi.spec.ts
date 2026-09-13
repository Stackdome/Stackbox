import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import * as contract from './index'

type Schema = { properties?: Record<string, unknown>; enum?: string[]; 'x-enum-varnames'?: string[] }

type Document = {
  paths: Record<string, unknown>
  components: { schemas: Record<string, Schema> }
}

const GENERATED_ENUM_COUNT = 47

const SPEC_ENUMS = [
  'RepoProvider', 'ConnectionStatus', 'InstancePurpose', 'InstanceStatus', 'ReleaseStatus',
  'ReportSource', 'TaskKind', 'TaskPhase', 'TaskResolution', 'RunOutcome', 'SandboxStatus',
  'ExecutionStatus', 'CheckKind', 'CheckOutcome', 'ArtifactOwner', 'ArtifactKind', 'PrState',
  'MessageRole', 'CoarseStatus', 'ApplicationRole', 'TaskEventKind',
]

const TASK_PATHS = [
  '/api/v1/organizations/{org_id}/tasks',
  '/api/v1/organizations/{org_id}/tasks/{task_id}',
  '/api/v1/organizations/{org_id}/tasks/{task_id}/cancel',
  '/api/v1/organizations/{org_id}/tasks/{task_id}/events',
  '/api/v1/organizations/{org_id}/tasks/{task_id}/checks',
  '/api/v1/organizations/{org_id}/tasks/{task_id}/runs',
  '/api/v1/organizations/{org_id}/tasks/{task_id}/messages',
  '/api/v1/organizations/{org_id}/tasks/{task_id}/artifacts',
  '/api/v1/organizations/{org_id}/artifacts',
  '/api/v1/organizations/{org_id}/artifacts/{artifact_id}',
  '/api/v1/organizations/{org_id}/applications',
]

const TASK_SUMMARY_FIELDS = [
  'id', 'application', 'report', 'kind', 'phase', 'coarse_status', 'resolution', 'run_number',
  'run_limit', 'blocking_question', 'pull_request', 'instance', 'cost_cents', 'created_at',
  'completed_at',
]

const TASK_DETAIL_ONLY_FIELDS = ['target_branch', 'budget_cents', 'pull_requests']

const yamlPath = fileURLToPath(new URL('../openapi/stackbox_api.yaml', import.meta.url))
const source = readFileSync(yamlPath, 'utf8')
const document = load(source) as Document
const paths = Object.keys(document.paths)
const schemas = document.components.schemas

// Generated string enums are plain objects of strings; zod schemas are class instances.
function isEnum(value: unknown): boolean {
  return typeof value === 'object' && value !== null
    && Object.getPrototypeOf(value) === Object.prototype
    && Object.values(value).every((member) => typeof member === 'string')
}

describe('the committed contract', () => {
  it('has no path carrying project_name or a /projects/ segment', () => {
    expect(paths.filter((path) => /project_name|\/projects\//.test(path))).toEqual([])
  })

  it('has no path under /stacks', () => {
    expect(paths.filter((path) => /\/stacks(\/|$)/.test(path))).toEqual([])
  })

  it('resolves every schema reference to a schema it defines', () => {
    const references = [...source.matchAll(/\$ref: ['"]?#\/components\/schemas\/([\w.-]+)/g)].map((match) => match[1])
    expect(references.filter((name) => !(name in schemas))).toEqual([])
  })

  it('exports exactly 47 enums from the barrel', () => {
    expect(Object.values(contract).filter(isEnum)).toHaveLength(GENERATED_ENUM_COUNT)
  })

  it('has no property key naming a stack', () => {
    const keys = Object.values(schemas).flatMap((schema) => Object.keys(schema.properties ?? {}))
    expect(keys.filter((key) => /stack/i.test(key))).toEqual([])
  })

  it('declares every spec section 4.1 enum with one varname per value', () => {
    const mismatched = SPEC_ENUMS.filter((name) => {
      const schema = schemas[name]
      return schema?.enum === undefined || schema['x-enum-varnames']?.length !== schema.enum.length
    })
    expect(mismatched).toEqual([])
  })

  it('declares the tasks and applications paths under the organization', () => {
    expect(TASK_PATHS.filter((path) => !paths.includes(path))).toEqual([])
  })

  it('requires exactly the fields a Tasks list row draws on every TaskSummary', () => {
    const summary = schemas.TaskSummary as Schema & { required?: string[] }
    expect(summary?.required).toEqual(TASK_SUMMARY_FIELDS)
  })

  it('requires every TaskSummary field on TaskDetail plus the fields only the detail screen draws', () => {
    const detail = schemas.TaskDetail as Schema & { required?: string[] }
    expect(detail?.required).toEqual([...TASK_SUMMARY_FIELDS, ...TASK_DETAIL_ONLY_FIELDS])
  })

  it('refuses the onboarding kind with the exact message the new task drawer shows', () => {
    expect(source).toContain("message: Tasks of kind onboarding are not supported yet")
  })
})
