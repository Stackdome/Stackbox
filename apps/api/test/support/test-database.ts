import { Client } from 'pg'
import { createDb, runMigrations, type Database } from '../../src/db/client'
import { assertTestDatabaseUrl } from './assert-test-database'

export async function migratedTestDatabase(): Promise<Database> {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL must be set to run the store tests')
  }
  assertTestDatabaseUrl(url)
  const client = new Client({ connectionString: url })
  await client.connect()
  await client.query('drop schema if exists drizzle cascade; drop schema public cascade; create schema public;')
  await client.end()
  await runMigrations(url)
  return createDb(url)
}
