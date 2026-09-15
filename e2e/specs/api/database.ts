import { UserRole } from '@stackbox/contract'
import { Client } from 'pg'

// The same fallback playwright.config.ts gives the api webServer.
const TEST_DATABASE_URL = 'postgres://postgres:postgres@localhost:5433/stackbox_test'

// Mirrors ORG_SCOPE in apps/api/src/access/types.ts.
const ORG_SCOPE = 'org'

const SEEDED_ADMIN_EMAIL = 'ada@example.com'

export type Twin = { email: string; acmeId: string; globexId: string }

async function withClient<T>(work: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_URL ?? TEST_DATABASE_URL })
  await client.connect()
  try {
    return await work(client)
  } finally {
    await client.end()
  }
}

// No route creates a second organization and the seed keeps one, so the twin is arranged here and removed after.
export function arrangeTwin(email: string): Promise<Twin> {
  return withClient(async (client) => {
    const admin = await client.query<{ org_id: string; password_hash: string }>('select org_id, password_hash from user_account where email = $1', [SEEDED_ADMIN_EMAIL])
    const globex = await client.query<{ id: string }>("insert into organization (name) values ('globex') returning id")
    const memberships: [string, UserRole][] = [
      [admin.rows[0].org_id, UserRole.OrgMember],
      [globex.rows[0].id, UserRole.OrgAdmin],
    ]
    for (const [orgId, role] of memberships) {
      const account = await client.query<{ id: string }>(
        'insert into user_account (org_id, email, name, password_hash, org_role) values ($1, $2, $3, $4, $5) returning id',
        [orgId, email, 'Twin', admin.rows[0].password_hash, role],
      )
      await client.query('insert into role_binding (org_id, user_id, subject, scope) values ($1, $2, $3, $4)', [orgId, account.rows[0].id, role, ORG_SCOPE])
    }
    return { email, acmeId: admin.rows[0].org_id, globexId: globex.rows[0].id }
  })
}

export function removeTwin(twin: Twin): Promise<void> {
  return withClient(async (client) => {
    await client.query('delete from user_account where email = $1', [twin.email])
    await client.query('delete from organization where id = $1', [twin.globexId])
  })
}
