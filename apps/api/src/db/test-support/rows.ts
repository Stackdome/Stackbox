import { RepoProvider } from '@stackbox/contract'
import { sql } from 'drizzle-orm'
import type { Database } from '../client'
import { application, organization, repository } from '../schema'

export const IDS = {
  org: '00000000-0000-4000-8000-000000000001',
  otherOrg: '00000000-0000-4000-8000-000000000002',
  repository: '00000000-0000-4000-8000-000000000003',
  otherRepository: '00000000-0000-4000-8000-000000000004',
  application: '00000000-0000-4000-8000-000000000005',
  otherApplication: '00000000-0000-4000-8000-000000000006',
  user: '00000000-0000-4000-8000-000000000007',
  otherUser: '00000000-0000-4000-8000-000000000008',
  report: '00000000-0000-4000-8000-000000000009',
  task: '00000000-0000-4000-8000-00000000000a',
  otherTask: '00000000-0000-4000-8000-00000000000b',
  run1: '00000000-0000-4000-8000-00000000000c',
  run2: '00000000-0000-4000-8000-00000000000d',
} as const

export async function emptyTables(db: Database): Promise<void> {
  await db.execute(sql`truncate organization, artifact cascade`)
}

export async function insertOrganization(db: Database, id: string, name = 'acme'): Promise<void> {
  await db.insert(organization).values({ id, name })
}

export async function insertApplication(
  db: Database,
  row: { orgId: string; repositoryId: string; id: string; name: string },
): Promise<void> {
  await db.insert(repository).values({
    id: row.repositoryId,
    orgId: row.orgId,
    provider: RepoProvider.Github,
    externalId: row.repositoryId,
    fullName: `acme/${row.name}`,
  })
  await db.insert(application).values({ id: row.id, orgId: row.orgId, name: row.name, slug: row.name, repositoryId: row.repositoryId })
}
