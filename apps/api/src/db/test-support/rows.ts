import { InstancePurpose, type InstanceStatus, type InviteStatus, RepoProvider, type ReleaseStatus, UserRole } from '@stackbox/contract'
import { sql } from 'drizzle-orm'
import { ORG_SCOPE } from '../../access/types'
import type { Database } from '../client'
import {
  apiToken,
  application,
  applicationInstance,
  gitConnection,
  invite,
  organization,
  release,
  repository,
  roleBinding,
  userAccount,
} from '../schema'

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
  connection: '00000000-0000-4000-8000-00000000000e',
  sandbox: '00000000-0000-4000-8000-00000000000f',
  execution: '00000000-0000-4000-8000-000000000010',
  instance: '00000000-0000-4000-8000-000000000011',
  message: '00000000-0000-4000-8000-000000000012',
  otherConnection: '00000000-0000-4000-8000-000000000013',
  secondRepository: '00000000-0000-4000-8000-000000000014',
  secondApplication: '00000000-0000-4000-8000-000000000015',
  secondConnection: '00000000-0000-4000-8000-000000000016',
  otherInstance: '00000000-0000-4000-8000-000000000017',
  secondInstance: '00000000-0000-4000-8000-000000000018',
  release: '00000000-0000-4000-8000-000000000019',
  secondRelease: '00000000-0000-4000-8000-00000000001a',
  invite: '00000000-0000-4000-8000-00000000001b',
  secondInvite: '00000000-0000-4000-8000-00000000001c',
  apiToken: '00000000-0000-4000-8000-00000000001d',
  secondApiToken: '00000000-0000-4000-8000-00000000001e',
  secondUser: '00000000-0000-4000-8000-00000000001f',
} as const

export const TEST_INSTALLATION_REF = 'acme-installation'

function connectionIdOf(orgId: string): string {
  return orgId === IDS.org ? IDS.connection : IDS.otherConnection
}

export async function emptyTables(db: Database): Promise<void> {
  await db.execute(sql`truncate organization, artifact cascade`)
}

export async function insertOrganization(db: Database, id: string, name = 'acme'): Promise<void> {
  await db.insert(organization).values({ id, name })
}

export async function insertGitConnection(
  db: Database,
  orgId: string,
  overrides: { id?: string; installationRef?: string; accountLogin?: string } = {},
): Promise<void> {
  await db
    .insert(gitConnection)
    .values({
      id: overrides.id ?? connectionIdOf(orgId),
      orgId,
      provider: RepoProvider.Github,
      installationRef: overrides.installationRef ?? TEST_INSTALLATION_REF,
      accountLogin: overrides.accountLogin ?? 'acme',
    })
    .onConflictDoNothing()
}

export async function insertRepository(
  db: Database,
  row: { orgId: string; id: string; name: string; externalId?: string; connectionId?: string },
): Promise<void> {
  await insertGitConnection(db, row.orgId)
  await db.insert(repository).values({
    id: row.id,
    orgId: row.orgId,
    connectionId: row.connectionId ?? connectionIdOf(row.orgId),
    provider: RepoProvider.Github,
    externalId: row.externalId ?? row.id,
    fullName: `acme/${row.name}`,
  })
}

export async function insertApplicationOn(
  db: Database,
  row: { orgId: string; repositoryId: string; id: string; name: string },
): Promise<void> {
  await db.insert(application).values({ id: row.id, orgId: row.orgId, name: row.name, slug: row.name, repositoryId: row.repositoryId })
}

export async function insertApplication(
  db: Database,
  row: { orgId: string; repositoryId: string; id: string; name: string },
): Promise<void> {
  await insertRepository(db, { orgId: row.orgId, id: row.repositoryId, name: row.name })
  await insertApplicationOn(db, row)
}

export async function insertUser(db: Database, row: { id: string; orgId: string; name: string }): Promise<void> {
  await db.insert(userAccount).values({ id: row.id, orgId: row.orgId, name: row.name, email: `${row.id}@example.com` })
}

export async function insertInstance(
  db: Database,
  row: {
    id: string
    applicationId: string
    purpose?: InstancePurpose
    status?: InstanceStatus
    taskId?: string | null
    createdBy?: string | null
    url?: string | null
    expiresAt?: Date | null
    createdAt?: Date
  },
): Promise<void> {
  await db.insert(applicationInstance).values({ purpose: InstancePurpose.Scratch, ...row })
}

export async function insertRelease(
  db: Database,
  row: { instanceId: string; id?: string; status?: ReleaseStatus; commitSha?: string; ref?: string | null; runId?: string | null; createdAt?: Date },
): Promise<void> {
  await db.insert(release).values({ commitSha: 'origin-sha', ...row })
}

export async function insertMember(
  db: Database,
  row: { id: string; orgId: string; name: string; email?: string; role?: UserRole; passwordHash?: string | null },
): Promise<void> {
  const role = row.role ?? UserRole.OrgMember
  await db
    .insert(userAccount)
    .values({ id: row.id, orgId: row.orgId, name: row.name, email: row.email ?? `${row.id}@example.com`, orgRole: role, passwordHash: row.passwordHash ?? null })
  await db.insert(roleBinding).values({ orgId: row.orgId, userId: row.id, subject: role, scope: ORG_SCOPE })
}

export async function insertInvite(
  db: Database,
  row: {
    orgId: string
    email: string
    tokenHash: string
    expiresAt: Date
    id?: string
    role?: UserRole
    status?: InviteStatus
    createdBy?: string | null
    createdAt?: Date
  },
): Promise<void> {
  await db.insert(invite).values({ role: UserRole.OrgMember, ...row })
}

export async function insertApiToken(
  db: Database,
  row: {
    userId: string
    orgId: string
    tokenHash: string
    id?: string
    name?: string
    prefix?: string
    expiresAt?: Date | null
    lastUsedAt?: Date | null
    revokedAt?: Date | null
    createdAt?: Date
  },
): Promise<void> {
  await db.insert(apiToken).values({ name: 'ci', prefix: row.tokenHash.slice(0, 8), ...row })
}
