import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Client } from 'pg'
import { runMigrations } from '../src/db/client'
import { assertTestDatabaseUrl } from './support/assert-test-database'

const url = process.env.DATABASE_URL as string

const DOMAIN_TABLES = [
  'organization', 'user_account', 'repository', 'git_connection', 'application', 'service',
  'application_instance', 'release', 'report', 'task', 'run', 'sandbox', 'execution',
  'task_check', 'pull_request', 'artifact', 'task_message', 'task_event', 'policy',
  'role_binding',
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
})
