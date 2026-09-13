import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import * as schema from './schema'

// pg silently falls back to localhost:5432 when connectionString is
// undefined or empty, so a missing DATABASE_URL would otherwise talk to the
// wrong database instead of failing loudly.
export function requireDatabaseUrl(url: string | undefined): string {
  if (!url) {
    throw new Error('DATABASE_URL is required')
  }
  return url
}

export function createDb(url: string | undefined): NodePgDatabase<typeof schema> {
  return drizzle(new Pool({ connectionString: requireDatabaseUrl(url) }), { schema })
}

export async function runMigrations(url: string | undefined): Promise<void> {
  const pool = new Pool({ connectionString: requireDatabaseUrl(url) })
  try {
    await migrate(drizzle(pool, { schema }), { migrationsFolder: 'src/db/migrations' })
  } finally {
    await pool.end()
  }
}
