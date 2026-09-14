import { InstanceStatus, UserRole, type InstancePurpose } from '@stackbox/contract'
import { eq } from 'drizzle-orm'
import type { AuthUser } from '../../access'
import { SHOP_LISTED, aShopListing } from '../../applications/test-support/builders'
import { ApplicationStore } from '../../db/application-store'
import type { Database } from '../../db/client'
import { InstanceStore } from '../../db/instance-store'
import { ReleaseStore } from '../../db/release-store'
import { application, service } from '../../db/schema'
import { IDS, insertApplicationOn, insertInstance, insertOrganization, insertRepository, insertUser } from '../../db/test-support/rows'
import type { DeployTarget } from '../../ports'
import { DEFAULT_RELEASE_SCRIPT, InMemoryClock, type ReleaseStep, ScriptedDeployTarget } from '../../ports/fakes'
import { ReleaseService } from '../../releases/release.service'
import { LISTED_HEAD_SHA } from '../../repositories/test-support/builders'
import { InstanceService } from '../instance.service'

export const WORLD_NOW = new Date('2026-09-14T10:00:00Z')

export const ADA: AuthUser = { id: IDS.user, orgId: IDS.org, email: 'ada@example.com', orgRole: UserRole.OrgAdmin }

export async function aSyncedShop(db: Database): Promise<void> {
  await insertOrganization(db, IDS.org)
  await insertOrganization(db, IDS.otherOrg, 'globex')
  await insertRepository(db, { orgId: IDS.org, id: IDS.repository, name: 'shop', externalId: SHOP_LISTED.externalId })
  await insertApplicationOn(db, { orgId: IDS.org, repositoryId: IDS.repository, id: IDS.application, name: 'shop' })
  await db.update(application).set({ syncedAtSha: LISTED_HEAD_SHA }).where(eq(application.id, IDS.application))
  await db.insert(service).values({ applicationId: IDS.application, name: 'api', path: 'apps/api', repositoryId: IDS.repository })
  await insertUser(db, { id: IDS.user, orgId: IDS.org, name: 'Ada Lovelace' })
}

export async function aRunningInstance(
  db: Database,
  deploy: DeployTarget,
  overrides: { purpose?: InstancePurpose; status?: InstanceStatus; expiresAt?: Date | null } = {},
): Promise<string> {
  const { id } = await deploy.createInstance({ applicationId: IDS.application, services: [], variables: {} })
  await insertInstance(db, { id, applicationId: IDS.application, status: InstanceStatus.Ready, url: await deploy.instanceUrl({ id }), ...overrides })
  return id
}

export function anInstanceWorld(db: Database, steps: readonly ReleaseStep[] = DEFAULT_RELEASE_SCRIPT) {
  const clock = new InMemoryClock(WORLD_NOW)
  const deploy = new ScriptedDeployTarget(clock, steps)
  const git = aShopListing(LISTED_HEAD_SHA)
  const instances = new InstanceStore(db)
  const releases = new ReleaseService(instances, new ReleaseStore(db), deploy, git)
  const service = new InstanceService(instances, new ApplicationStore(db), releases, deploy, clock)
  return { clock, deploy, git, instances, releases, service }
}
