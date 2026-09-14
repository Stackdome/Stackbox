import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { InstanceExpiryHours, InstancePurpose, InstanceStatus, ReleaseStatus } from '@stackbox/contract'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import type { Database } from '../db/client'
import { application } from '../db/schema'
import { IDS, emptyTables } from '../db/test-support/rows'
import { LISTED_HEAD_SHA } from '../repositories/test-support/builders'
import {
  ADA,
  DeployReleaseAndTeardownFail,
  DeployReleaseFailsOnce,
  InsertFailsInstanceStore,
  anInstanceWorld,
  anInstanceWorldWithDeploy,
  anInstanceWorldWithStore,
  aSyncedShop,
} from './test-support/world'

const HOUR_MS = 3_600_000

describe('InstanceService', () => {
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

  it('spins up a scratch instance that expires in 72 hours, owned by its creator, with a url and a queued first release at the default branch head', async () => {
    const { service } = anInstanceWorld(db)

    const created = await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Scratch })

    expect({
      status: created.status,
      expires: created.expires_at,
      owner: created.owner,
      hasUrl: created.url !== null,
      releases: created.releases.map((release) => [release.status, release.ref, release.commit_sha]),
    }).toEqual({
      status: InstanceStatus.Provisioning,
      expires: '2026-09-17T10:00:00.000Z',
      owner: { id: IDS.user, name: 'Ada Lovelace' },
      hasUrl: true,
      releases: [[ReleaseStatus.Queued, 'main', LISTED_HEAD_SHA]],
    })
  })

  it('refuses the task purpose, which tasks keep for their own instances', async () => {
    const { service } = anInstanceWorld(db)

    const refused = await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Task }).catch((error: unknown) => error)

    expect(refused instanceof BadRequestException && refused.getResponse()).toEqual({ code: 'purpose_reserved', message: 'Tasks create their own instances' })
  })

  it('refuses an application whose Stackfile never synced', async () => {
    await db.update(application).set({ syncedAtSha: null }).where(eq(application.id, IDS.application))
    const { service } = anInstanceWorld(db)

    const refused = await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Scratch }).catch((error: unknown) => error)

    expect(refused instanceof ConflictException && refused.getResponse()).toEqual({
      code: 'application_not_synced',
      message: "Sync the application's Stackfile before spinning up an instance",
    })
  })

  it('leaves no instance behind when the ref does not resolve', async () => {
    const { service } = anInstanceWorld(db)

    await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Scratch, ref: 'no-such-branch' }).catch(() => undefined)

    expect((await service.list(IDS.org, { includeTornDown: true })).total).toBe(0)
  })

  it('tears the instance down again when its first release cannot be opened', async () => {
    const failure = new Error('vendor rejected the release')
    const deploy = new DeployReleaseFailsOnce(failure)
    const { service } = anInstanceWorldWithDeploy(db, deploy)

    const refused = await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Scratch }).catch((error: unknown) => error)
    const [instance] = (await service.list(IDS.org, { includeTornDown: true })).items

    expect([refused, deploy.isTornDown({ id: instance.id }), instance.status]).toEqual([failure, true, InstanceStatus.TornDown])
  })

  it('tears the vendor instance down when the insert is refused', async () => {
    const error = new Error('insert refused')
    const store = new InsertFailsInstanceStore(db, error)
    const { deploy, service } = anInstanceWorldWithStore(db, store)

    const refused = await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Scratch }).catch((e: unknown) => e)

    expect([refused, deploy.isTornDown({ id: store.lastAttemptedId ?? '' })]).toEqual([error, true])
  })

  it('surfaces the original error when teardown also fails after the release could not be opened', async () => {
    const openError = new Error('vendor rejected the release')
    const teardownError = new Error('vendor unreachable')
    const deploy = new DeployReleaseAndTeardownFail(openError, teardownError)
    const { service } = anInstanceWorldWithDeploy(db, deploy)

    const refused = await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Scratch }).catch((e: unknown) => e)

    expect(refused).toBe(openError)
  })

  it('refuses an application of another organization as unknown', async () => {
    const { service } = anInstanceWorld(db)

    const refused = await service.spinUp(IDS.otherOrg, ADA, { application_id: IDS.application, purpose: InstancePurpose.Scratch }).catch((error: unknown) => error)

    expect(refused instanceof NotFoundException && refused.getResponse()).toEqual({ code: 'unknown_application', message: 'application not found' })
  })

  it('tears an instance down and answers it torn down again on a second call', async () => {
    const { deploy, service } = anInstanceWorld(db)
    const created = await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Scratch })

    const first = await service.teardown(IDS.org, created.id)
    const second = await service.teardown(IDS.org, created.id)

    expect([first.status, second.status, deploy.isTornDown({ id: created.id })]).toEqual([InstanceStatus.TornDown, InstanceStatus.TornDown, true])
  })

  it('extends the expiry from now when that is later than the current expiry', async () => {
    const { clock, service } = anInstanceWorld(db)
    const created = await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Scratch })
    clock.advance(80 * HOUR_MS)

    const extended = await service.extendExpiry(IDS.org, created.id, { hours: InstanceExpiryHours.Day })

    expect(extended.expires_at).toBe('2026-09-18T18:00:00.000Z')
  })

  it('extends a 7d instance by 24h without shortening its expiry', async () => {
    const { clock, service } = anInstanceWorld(db)
    const created = await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Scratch, expires_in_hours: InstanceExpiryHours.Week })
    clock.advance(10 * HOUR_MS)

    const extended = await service.extendExpiry(IDS.org, created.id, { hours: InstanceExpiryHours.Day })

    expect(extended.expires_at).toBe(created.expires_at)
  })

  it('refuses to extend a persistent instance', async () => {
    const { service } = anInstanceWorld(db)
    const created = await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Persistent })

    const refused = await service.extendExpiry(IDS.org, created.id, { hours: InstanceExpiryHours.Day }).catch((error: unknown) => error)

    expect(refused instanceof ConflictException && refused.getResponse()).toEqual({ code: 'instance_has_no_expiry', message: 'A persistent instance never expires' })
  })

  it('refuses to extend an instance that has already expired', async () => {
    const { instances, service } = anInstanceWorld(db)
    const created = await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Scratch })
    await instances.setStatus(created.id, InstanceStatus.Expired)

    const refused = await service.extendExpiry(IDS.org, created.id, { hours: InstanceExpiryHours.Day }).catch((error: unknown) => error)

    expect(refused instanceof ConflictException && refused.getResponse()).toEqual({
      code: 'instance_not_running',
      message: 'This instance has expired or been torn down',
    })
  })

  it('lists nothing for an application id that is not a uuid', async () => {
    const { service } = anInstanceWorld(db)
    await service.spinUp(IDS.org, ADA, { application_id: IDS.application, purpose: InstancePurpose.Scratch })

    expect(await service.list(IDS.org, { applicationId: 'not-a-uuid', includeTornDown: false })).toEqual({ items: [], total: 0 })
  })
})
