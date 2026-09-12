import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import * as schema from './schema'

export function createDb(url: string): NodePgDatabase<typeof schema> {
  return drizzle(new Pool({ connectionString: url }), { schema })
}

export async function runMigrations(url: string): Promise<void> {
  const db = createDb(url)
  await migrate(db, { migrationsFolder: 'src/db/migrations' })
}
