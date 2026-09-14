import { ConflictException, NotFoundException } from '@nestjs/common'
import { InstanceStatus, ReleaseStatus } from '@stackbox/contract'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { SHOP_LISTED, aShopListing } from '../applications/test-support/builders'
import type { Database } from '../db/client'
import { InstanceStore } from '../db/instance-store'
import { ReleaseStore } from '../db/release-store'
import { IDS, TEST_INSTALLATION_REF, emptyTables, insertRelease } from '../db/test-support/rows'
import { aRunningInstance, aSyncedShop, anInstanceWorld } from '../instances/test-support/world'
import type { DeployTarget } from '../ports'
import { DEFAULT_RELEASE_SCRIPT, InMemoryClock, ScriptedDeployTarget } from '../ports/fakes'
import { LISTED_HEAD_SHA } from '../repositories/test-support/builders'
import { ReleaseService } from './release.service'

describe('ReleaseService', () => {
  let db: Database

  beforeAll(async () => {
    db = await migratedTestDatabase()
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await aSyncedShop(db)
  })

  it('opens the first release of an instance queued at the head of the default branch', async () => {
    const { deploy, releases } = anInstanceWorld(db)
    const instanceId = await aRunningInstance(db, deploy)

    const opened = await releases.create(IDS.org, instanceId, {})

    expect([opened.status, opened.ref, opened.commit_sha, opened.run_number]).toEqual([ReleaseStatus.Queued, 'main', LISTED_HEAD_SHA, null])
  })

  it('opens a release at the head of the ref the latest release used', async () => {
    const { deploy, git, releases } = anInstanceWorld(db)
    const { sha } = await git.pushPatch({ id: TEST_INSTALLATION_REF }, { id: SHOP_LISTED.externalId }, { baseRef: 'main', headRef: 'release/2', patch: Buffer.from('') })
    const instanceId = await aRunningInstance(db, deploy)
    await insertRelease(db, { instanceId, status: ReleaseStatus.Live, ref: 'release/2' })

    const opened = await releases.create(IDS.org, instanceId, {})

    expect([opened.ref, opened.commit_sha]).toEqual(['release/2', sha])
  })

  it('refuses a second release while one is queued or building', async () => {
    const { deploy, releases } = anInstanceWorld(db)
    const instanceId = await aRunningInstance(db, deploy)
    await releases.create(IDS.org, instanceId, {})

    const refused = await releases.create(IDS.org, instanceId, {}).catch((error: unknown) => error)

    expect(refused instanceof ConflictException && refused.getResponse()).toEqual({
      code: 'release_in_flight',
      message: 'Wait for the release in flight to finish first',
    })
  })

  it('refuses a release on an instance that has been torn down', async () => {
    const { deploy, releases } = anInstanceWorld(db)
    const instanceId = await aRunningInstance(db, deploy, { status: InstanceStatus.TornDown })

    const refused = await releases.create(IDS.org, instanceId, {}).catch((error: unknown) => error)

    expect(refused instanceof ConflictException && refused.getResponse()).toEqual({
      code: 'instance_not_running',
      message: 'This instance has expired or been torn down',
    })
  })

  it('answers unknown_ref for a ref the provider cannot resolve', async () => {
    const { deploy, releases } = anInstanceWorld(db)
    const instanceId = await aRunningInstance(db, deploy)

    const refused = await releases.create(IDS.org, instanceId, { ref: 'no-such-branch' }).catch((error: unknown) => error)

    expect(refused instanceof NotFoundException && refused.getResponse()).toEqual({
      code: 'unknown_ref',
      message: 'The repository has no branch or tag with this name',
    })
  })

  it('propagates a provider failure that is not an unknown ref', async () => {
    const { releases } = anInstanceWorld(db)
    const unlistedRepository = { id: 'missing-repo', fullName: 'acme/missing', defaultBranch: 'main', externalId: 'missing-external-id', installationRef: TEST_INSTALLATION_REF }

    const failure = await releases.resolveCommit(unlistedRepository, 'main').catch((error: unknown) => error)

    expect(failure instanceof NotFoundException).toBe(false)
    expect(failure).toBeInstanceOf(Error)
  })

  it('leaves no release row when the deploy target rejects a resolved commit', async () => {
    class RejectingDeployTarget extends ScriptedDeployTarget {
      override async deployRelease(): Promise<never> {
        throw new Error('deploy target unavailable')
      }
    }
    const deploy = new RejectingDeployTarget(new InMemoryClock(new Date()), DEFAULT_RELEASE_SCRIPT)
    const instanceId = await aRunningInstance(db, deploy)
    const releases = new ReleaseService(new InstanceStore(db), new ReleaseStore(db), deploy, aShopListing(LISTED_HEAD_SHA))

    const failure = await releases.create(IDS.org, instanceId, {}).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(Error)
    expect((await releases.list(IDS.org, instanceId)).items).toEqual([])
  })

  it('answers not found for an instance of another organization and for an id that is not a uuid', async () => {
    const { deploy, releases } = anInstanceWorld(db)
    const instanceId = await aRunningInstance(db, deploy)

    const refusals = await Promise.all([releases.list(IDS.otherOrg, instanceId), releases.list(IDS.org, 'not-a-uuid')].map((call) => call.catch((error: unknown) => error)))

    expect(refusals.map((refusal) => refusal instanceof NotFoundException)).toEqual([true, true])
  })

  it('advances a release as the provider walks it and never moves a settled one back', async () => {
    const { clock, deploy, releases } = anInstanceWorld(db)
    const instanceId = await aRunningInstance(db, deploy)
    const opened = await releases.open(instanceId, { commitSha: LISTED_HEAD_SHA, ref: 'main' })
    clock.advance(1_000)

    const walked = await releases.advance(opened)
    const settled = await releases.advance({ ...opened, status: ReleaseStatus.Live })

    expect([walked, settled, (await releases.list(IDS.org, instanceId)).items.map((release) => release.status)]).toEqual([
      ReleaseStatus.Building,
      ReleaseStatus.Live,
      [ReleaseStatus.Building],
    ])
  })

  it('advancing a settled release makes no call to the deploy target', async () => {
    class CountingDeployTarget extends ScriptedDeployTarget {
      releaseStatusCalls = 0
      override async releaseStatus(ref: Parameters<DeployTarget['releaseStatus']>[0]): ReturnType<DeployTarget['releaseStatus']> {
        this.releaseStatusCalls += 1
        return super.releaseStatus(ref)
      }
    }
    const deploy = new CountingDeployTarget(new InMemoryClock(new Date()), DEFAULT_RELEASE_SCRIPT)
    const instanceId = await aRunningInstance(db, deploy)
    const releases = new ReleaseService(new InstanceStore(db), new ReleaseStore(db), deploy, aShopListing(LISTED_HEAD_SHA))
    const opened = await releases.open(instanceId, { commitSha: LISTED_HEAD_SHA, ref: 'main' })

    const settled = await releases.advance({ ...opened, status: ReleaseStatus.Live })

    expect([settled, deploy.releaseStatusCalls]).toEqual([ReleaseStatus.Live, 0])
  })

  it('lists the releases still in flight across instances', async () => {
    const { deploy, releases } = anInstanceWorld(db)
    const first = await aRunningInstance(db, deploy)
    const second = await aRunningInstance(db, deploy)
    await releases.open(first, { commitSha: LISTED_HEAD_SHA, ref: 'main' })
    await releases.open(second, { commitSha: LISTED_HEAD_SHA, ref: 'main' })

    expect((await releases.inFlight()).map((release) => release.instanceId).sort()).toEqual([first, second].sort())
  })
})
