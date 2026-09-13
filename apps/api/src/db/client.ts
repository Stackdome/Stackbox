import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import * as schema from './schema'

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION'

// pg silently falls back to localhost:5432 when connectionString is
// undefined or empty, so a missing DATABASE_URL would otherwise talk to the
// wrong database instead of failing loudly.
export function requireDatabaseUrl(url: string | undefined): string {
  if (!url) {
    throw new Error('DATABASE_URL is required')
  }
  return url
}

export function createDb(url: string | undefined) {
  return drizzle(new Pool({ connectionString: requireDatabaseUrl(url) }), { schema })
}

// $client (the underlying Pool) is only present on the factory's return type,
// not on the NodePgDatabase class, so Database is derived from createDb.
export type Database = ReturnType<typeof createDb>

export async function runMigrations(url: string | undefined): Promise<void> {
  const pool = new Pool({ connectionString: requireDatabaseUrl(url) })
  try {
    await migrate(drizzle(pool, { schema }), { migrationsFolder: 'src/db/migrations' })
  } finally {
    await pool.end()
  }
}
