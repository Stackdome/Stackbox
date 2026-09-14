import { InstanceExpiryHours, InstancePurpose, InstanceStatus, ReleaseStatus } from '@stackbox/contract'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import type { Database } from '../db/client'
import { IDS, emptyTables, insertInstance } from '../db/test-support/rows'
import { ADA, aSyncedShop, anInstanceWorld } from './test-support/world'

const HOUR_MS = 3_600_000
const WALK_MS = 3_000
const FAILING_SCRIPT = [
  { afterMs: 0, status: ReleaseStatus.Queued },
  { afterMs: 1_000, status: ReleaseStatus.Failed },
]

describe('InstanceSweep', () => {
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

  it('spins up a persistent instance with no expiry and walks its first release to live', async () => {
    const { clock, service, sweep } = anInstanceWorld(db)
    const created = await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Persistent, expires_in_hours: InstanceExpiryHours.Day })
    clock.advance(WALK_MS)

    await sweep.tick()

    const walked = await service.detail(IDS.org, created.id)
    expect({ expires: walked.expires_at, status: walked.status, releases: walked.releases.map((release) => release.status) }).toEqual({
      expires: null,
      status: InstanceStatus.Ready,
      releases: [ReleaseStatus.Live],
    })
  })

  it('expires a ready instance whose expiry has passed and releases its vendor resource', async () => {
    const { clock, deploy, service, sweep } = anInstanceWorld(db)
    const created = await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Scratch })
    clock.advance(WALK_MS)
    await sweep.tick()
    clock.advance(73 * HOUR_MS)

    await sweep.tick()

    expect([(await service.detail(IDS.org, created.id)).status, deploy.isTornDown({ id: created.id })]).toEqual([InstanceStatus.Expired, true])
  })

  it('degrades an instance whose latest release failed', async () => {
    const { clock, service, sweep } = anInstanceWorld(db, FAILING_SCRIPT)
    const created = await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Preview })
    clock.advance(WALK_MS)

    await sweep.tick()

    const degraded = await service.detail(IDS.org, created.id)
    expect([degraded.status, degraded.latest_release?.status]).toEqual([InstanceStatus.Degraded, ReleaseStatus.Failed])
  })

  it('fills the url of a task instance the reconciler created without one', async () => {
    const { deploy, instances, sweep } = anInstanceWorld(db)
    const created = await deploy.createInstance({ applicationId: IDS.application, services: [], variables: {} })
    await insertInstance(db, { id: created.id, applicationId: IDS.application, purpose: InstancePurpose.Task, url: null })

    await sweep.tick()

    expect((await instances.find(IDS.org, created.id))?.url).toBe(await deploy.instanceUrl(created))
  })
})
