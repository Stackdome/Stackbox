import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Client } from 'pg'
import { runMigrations } from '../src/db/client'
import { assertTestDatabaseUrl } from './support/assert-test-database'

const url = process.env.DATABASE_URL as string

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

  it('creates the organization table on an empty database', async () => {
    const result = await client.query(
      "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'organization'",
    )
    expect(result.rowCount).toBe(1)
  })
})
