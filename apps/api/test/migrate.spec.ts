import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Client } from 'pg'
import { runMigrations } from '../src/db/client'
import { assertTestDatabaseUrl } from './support/assert-test-database'

const url = process.env.DATABASE_URL as string

const DOMAIN_TABLES = [
  'organization', 'user_account', 'repository', 'git_connection', 'application', 'service',
  'application_instance', 'release', 'report', 'task', 'run', 'sandbox', 'execution',
  'task_check', 'pull_request', 'artifact', 'task_message', 'task_event', 'policy',
  'role_binding', 'invite', 'api_token',
]

describe('assertTestDatabaseUrl', () => {
  it('refuses to reset a database whose name does not end with _test', () => {
    expect(() =>
      assertTestDatabaseUrl('postgres://postgres:postgres@localhost:5433/production'),
    ).toThrow(/production/)
  })
})

describe('migrating an empty test database', () => {
  let client: Client

  beforeAll(async () => {
    if (!url) {
      throw new Error('DATABASE_URL must be set to run the migration smoke test')
    }
    assertTestDatabaseUrl(url)
    client = new Client({ connectionString: url })
    await client.connect()
    await client.query(
      'drop schema if exists drizzle cascade; drop schema public cascade; create schema public;',
    )
    await runMigrations(url)
  })

  afterAll(async () => {
    await client.end()
  })

  it('creates every table of the domain model on an empty database', async () => {
    const result = await client.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    )
    const created = result.rows.map((row) => row.table_name)
    expect(DOMAIN_TABLES.filter((table) => !created.includes(table))).toEqual([])
  })

  it('requires every repository to name the git connection it came through', async () => {
    const result = await client.query<{ is_nullable: string }>(
      "select is_nullable from information_schema.columns where table_name = 'repository' and column_name = 'connection_id'",
    )
    expect(result.rows.map((row) => row.is_nullable)).toEqual(['NO'])
  })

  it('keeps the last Stackfile validation error on the application', async () => {
    const result = await client.query<{ is_nullable: string }>(
      "select is_nullable from information_schema.columns where table_name = 'application' and column_name = 'validation_error'",
    )
    expect(result.rows.map((row) => row.is_nullable)).toEqual(['YES'])
  })

  it('starts every account at token version 0', async () => {
    const result = await client.query<{ is_nullable: string; column_default: string }>(
      "select is_nullable, column_default from information_schema.columns where table_name = 'user_account' and column_name = 'token_version'",
    )
    expect(result.rows).toEqual([{ is_nullable: 'NO', column_default: '0' }])
  })

  it('keeps an instance when the account that spun it up is removed', async () => {
    const result = await client.query<{ delete_rule: string }>(
      "select rc.delete_rule from information_schema.referential_constraints rc join information_schema.key_column_usage k on k.constraint_name = rc.constraint_name where k.table_name = 'application_instance' and k.column_name = 'created_by'",
    )
    expect(result.rows.map((row) => row.delete_rule)).toEqual(['SET NULL'])
  })

  it('stores invite tokens and api token secrets only as unique hashes', async () => {
    const result = await client.query<{ table_name: string }>(
      "select tc.table_name from information_schema.table_constraints tc join information_schema.key_column_usage k on k.constraint_name = tc.constraint_name where tc.constraint_type = 'UNIQUE' and k.column_name = 'token_hash' order by tc.table_name",
    )
    expect(result.rows.map((row) => row.table_name)).toEqual(['api_token', 'invite'])
  })
})
