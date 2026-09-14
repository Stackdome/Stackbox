import { InstancePurpose, InstanceStatus, ReleaseStatus, TaskPhase } from '@stackbox/contract'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { aReport, aTask } from '../tasks/test-support/builders'
import type { Database } from './client'
import { InstanceStore } from './instance-store'
import { report, task } from './schema'
import {
  IDS,
  TEST_INSTALLATION_REF,
  emptyTables,
  insertApplication,
  insertApplicationOn,
  insertInstance,
  insertOrganization,
  insertRelease,
  insertUser,
} from './test-support/rows'

const HOUR_AGO = new Date('2026-09-14T09:00:00Z')
const NOW = new Date('2026-09-14T10:00:00Z')
const TOMORROW = new Date('2026-09-15T10:00:00Z')

describe('InstanceStore', () => {
  let db: Database
  let instances: InstanceStore

  beforeAll(async () => {
    db = await migratedTestDatabase()
    instances = new InstanceStore(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org)
    await insertOrganization(db, IDS.otherOrg, 'globex')
    await insertApplication(db, { orgId: IDS.org, repositoryId: IDS.repository, id: IDS.application, name: 'shop' })
    await insertUser(db, { id: IDS.user, orgId: IDS.org, name: 'Ada Lovelace' })
  })

  it('lists the instances of one organization newest first with their owner and their releases newest first', async () => {
    await insertApplication(db, { orgId: IDS.otherOrg, repositoryId: IDS.otherRepository, id: IDS.otherApplication, name: 'ledger' })
    await insertInstance(db, { id: IDS.instance, applicationId: IDS.application, createdBy: IDS.user, createdAt: HOUR_AGO })
    await insertInstance(db, { id: IDS.secondInstance, applicationId: IDS.application, createdAt: NOW })
    await insertInstance(db, { id: IDS.otherInstance, applicationId: IDS.otherApplication })
    await insertRelease(db, { id: IDS.release, instanceId: IDS.instance, status: ReleaseStatus.Live, createdAt: HOUR_AGO })
    await insertRelease(db, { id: IDS.secondRelease, instanceId: IDS.instance, status: ReleaseStatus.Building, createdAt: NOW })

    const listed = await instances.list(IDS.org, { includeTornDown: false })

    expect(listed.map((record) => [record.id, record.application.name, record.owner?.name ?? null, record.releases.map((entry) => entry.id)])).toEqual([
      [IDS.secondInstance, 'shop', null, []],
      [IDS.instance, 'shop', 'Ada Lovelace', [IDS.secondRelease, IDS.release]],
    ])
  })

  it('hides torn down instances unless asked for them', async () => {
    await insertInstance(db, { id: IDS.instance, applicationId: IDS.application, status: InstanceStatus.TornDown })

    const hidden = await instances.list(IDS.org, { includeTornDown: false })
    const shown = await instances.list(IDS.org, { includeTornDown: true })

    expect([hidden.length, shown.map((record) => record.status)]).toEqual([0, [InstanceStatus.TornDown]])
  })

  it('narrows the list to one application', async () => {
    await insertApplicationOn(db, { orgId: IDS.org, repositoryId: IDS.repository, id: IDS.secondApplication, name: 'shop-admin' })
    await insertInstance(db, { id: IDS.instance, applicationId: IDS.application })
    await insertInstance(db, { id: IDS.secondInstance, applicationId: IDS.secondApplication })

    const narrowed = await instances.list(IDS.org, { applicationId: IDS.secondApplication, includeTornDown: false })

    expect(narrowed.map((record) => record.id)).toEqual([IDS.secondInstance])
  })

  it('names the task that owns a task instance and the provider refs of its repository', async () => {
    const written = aReport({ id: IDS.report, applicationId: IDS.application })
    await db.insert(report).values(written)
    await db.insert(task).values(aTask({ id: IDS.task, applicationId: IDS.application, reportId: IDS.report, phase: TaskPhase.Verifying }))
    await insertInstance(db, { id: IDS.instance, applicationId: IDS.application, purpose: InstancePurpose.Task, taskId: IDS.task })

    const found = await instances.find(IDS.org, IDS.instance)

    expect([found?.task, found?.owner, found?.repository.installationRef]).toEqual([
      { id: IDS.task, description: written.description, phase: TaskPhase.Verifying },
      null,
      TEST_INSTALLATION_REF,
    ])
  })

  it('finds nothing for an instance of another organization', async () => {
    await insertInstance(db, { id: IDS.instance, applicationId: IDS.application })

    expect(await instances.find(IDS.otherOrg, IDS.instance)).toBeNull()
  })

  it('stores a status, a url and an expiry', async () => {
    await insertInstance(db, { id: IDS.instance, applicationId: IDS.application, url: null })

    await instances.setStatus(IDS.instance, InstanceStatus.Ready)
    await instances.setUrl(IDS.instance, 'https://00000000.instances.test')
    await instances.setExpiry(IDS.instance, TOMORROW)

    const found = await instances.find(IDS.org, IDS.instance)
    expect([found?.status, found?.url, found?.expiresAt]).toEqual([InstanceStatus.Ready, 'https://00000000.instances.test', TOMORROW])
  })

  it('offers every instance not torn down to the sweep, across organizations', async () => {
    await insertApplication(db, { orgId: IDS.otherOrg, repositoryId: IDS.otherRepository, id: IDS.otherApplication, name: 'ledger' })
    await insertInstance(db, { id: IDS.instance, applicationId: IDS.application, status: InstanceStatus.Expired })
    await insertInstance(db, { id: IDS.secondInstance, applicationId: IDS.application, status: InstanceStatus.TornDown })
    await insertInstance(db, { id: IDS.otherInstance, applicationId: IDS.otherApplication, status: InstanceStatus.Provisioning })

    expect((await instances.live()).map((record) => record.id).sort()).toEqual([IDS.instance, IDS.otherInstance].sort())
  })

  it('never moves a torn down instance back to ready', async () => {
    await insertInstance(db, { id: IDS.instance, applicationId: IDS.application, status: InstanceStatus.TornDown })

    await instances.setStatus(IDS.instance, InstanceStatus.Ready, InstanceStatus.Provisioning)

    expect((await instances.find(IDS.org, IDS.instance))?.status).toBe(InstanceStatus.TornDown)
  })

  it('inserts an instance with the vendor id, its creator and its expiry', async () => {
    await instances.insert({ id: IDS.instance, applicationId: IDS.application, purpose: InstancePurpose.Preview, createdBy: IDS.user, url: 'https://a.instances.test', expiresAt: TOMORROW })

    const found = await instances.find(IDS.org, IDS.instance)
    expect([found?.purpose, found?.status, found?.owner, found?.expiresAt]).toEqual([
      InstancePurpose.Preview,
      InstanceStatus.Provisioning,
      { id: IDS.user, name: 'Ada Lovelace' },
      TOMORROW,
    ])
  })
})
