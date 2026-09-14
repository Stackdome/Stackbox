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

const GENERATED_ENUM_COUNT = 27

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

const PATH_COUNT = 44

const INSTANCE_PATHS = [
  '/api/v1/organizations/{org_id}/instances',
  '/api/v1/organizations/{org_id}/instances/{instance_id}',
  '/api/v1/organizations/{org_id}/instances/{instance_id}/releases',
  '/api/v1/organizations/{org_id}/instances/{instance_id}/teardown',
  '/api/v1/organizations/{org_id}/instances/{instance_id}/expiry',
]

const INSTANCE_DETAIL_FIELDS = [
  'id', 'application', 'repository', 'purpose', 'status', 'url', 'owner', 'task', 'latest_release', 'expires_at',
  'created_at', 'releases',
]

const APPLICATION_ENUMS = ['StackfileSync', 'ServiceKind']

const REPOSITORY_AND_APPLICATION_PATHS = [
  '/api/v1/organizations/{org_id}/git-connections',
  '/api/v1/organizations/{org_id}/git-connections/{connection_id}/verify',
  '/api/v1/organizations/{org_id}/git-connections/{connection_id}/available-repositories',
  '/api/v1/organizations/{org_id}/repositories',
  '/api/v1/organizations/{org_id}/repositories/{repository_id}',
  '/api/v1/organizations/{org_id}/applications',
  '/api/v1/organizations/{org_id}/applications/detect',
  '/api/v1/organizations/{org_id}/applications/{application_id}',
  '/api/v1/organizations/{org_id}/applications/{application_id}/services',
  '/api/v1/organizations/{org_id}/applications/{application_id}/sync',
]

const APPLICATION_DETAIL_FIELDS = [
  'id', 'name', 'slug', 'repository', 'stackfile_path', 'sync', 'synced_at_sha', 'head_sha',
  'validated_at', 'validation_error', 'credentials', 'services', 'task_count', 'created_at',
]

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

  it('exports exactly 27 string enums from the barrel', () => {
    expect(Object.values(contract).filter(isEnum)).toHaveLength(GENERATED_ENUM_COUNT)
  })

  it('has no property key naming a stack', () => {
    const keys = Object.values(schemas).flatMap((schema) => Object.keys(schema.properties ?? {}))
    expect(keys.filter((key) => /stack/i.test(key) && !/stackfile/i.test(key))).toEqual([])
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

  it('declares exactly 44 paths', () => {
    expect(paths).toHaveLength(PATH_COUNT)
  })

  it('carries no legacy git integration or GitHub webhook path', () => {
    expect(paths.filter((path) => /git-integrations|webhooks\/github/.test(path))).toEqual([])
  })

  it('declares the git connection, repository and application paths under the organization', () => {
    expect(REPOSITORY_AND_APPLICATION_PATHS.filter((path) => !paths.includes(path))).toEqual([])
  })

  it('declares the Stackfile sync and service kind enums with one varname per value', () => {
    const mismatched = APPLICATION_ENUMS.filter((name) => {
      const schema = schemas[name]
      return schema?.enum === undefined || schema['x-enum-varnames']?.length !== schema.enum.length
    })
    expect(mismatched).toEqual([])
  })

  it('requires every field the Application detail screen draws on ApplicationDetail', () => {
    const detail = schemas.ApplicationDetail as Schema & { required?: string[] }
    expect(detail?.required).toEqual(APPLICATION_DETAIL_FIELDS)
  })

  it('refuses a Stackfile path that walks out of the repository or starts from root, keeping a nested one', () => {
    const parse = (stackfile_path: string) =>
      contract.schemas.StackfileDetect.safeParse({ repository_id: '00000000-0000-4000-8000-000000000000', stackfile_path }).success
    expect([parse('../stackfile.yaml'), parse('/stackfile.yaml'), parse('admin/stackfile.yaml')]).toEqual([false, false, true])
  })

  it('carries no legacy instance path', () => {
    expect(paths.filter((path) => path.includes('/instances') && !INSTANCE_PATHS.includes(path))).toEqual([])
  })

  it('declares the instance and release paths under the organization', () => {
    expect(INSTANCE_PATHS.filter((path) => !paths.includes(path))).toEqual([])
  })

  it('requires every field the Instance detail screen draws on InstanceDetail', () => {
    const detail = schemas.InstanceDetail as Schema & { required?: string[] }
    expect(detail?.required).toEqual(INSTANCE_DETAIL_FIELDS)
  })

  it('offers expiry presets of 24, 72 and 168 hours with one varname each', () => {
    const presets = schemas.InstanceExpiryHours as { enum?: number[]; 'x-enum-varnames'?: string[] }
    expect([presets?.enum, presets?.['x-enum-varnames']]).toEqual([[24, 72, 168], ['Day', 'ThreeDays', 'Week']])
  })
})
