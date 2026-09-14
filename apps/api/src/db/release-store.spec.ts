import { InstanceStatus, ReleaseStatus, TaskPhase } from '@stackbox/contract'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { aReport, aRun, aTask } from '../tasks/test-support/builders'
import type { Database } from './client'
import { InstanceStore } from './instance-store'
import { ReleaseStore } from './release-store'
import { report, run, task } from './schema'
import { IDS, emptyTables, insertApplication, insertInstance, insertOrganization, insertRelease } from './test-support/rows'

const EARLIER = new Date('2026-09-14T09:00:00Z')
const LATER = new Date('2026-09-14T10:00:00Z')

describe('ReleaseStore', () => {
  let db: Database
  let releases: ReleaseStore
  let instances: InstanceStore

  beforeAll(async () => {
    db = await migratedTestDatabase()
    releases = new ReleaseStore(db)
    instances = new InstanceStore(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org)
    await insertApplication(db, { orgId: IDS.org, repositoryId: IDS.repository, id: IDS.application, name: 'shop' })
    await insertInstance(db, { id: IDS.instance, applicationId: IDS.application, status: InstanceStatus.Ready })
  })

  it('reads back an inserted release with no run', async () => {
    const stored = await releases.insert({ id: IDS.release, instanceId: IDS.instance, commitSha: 'a1b2c3d', ref: 'main', status: ReleaseStatus.Queued })

    expect({ ...stored, createdAt: undefined }).toEqual({
      id: IDS.release,
      instanceId: IDS.instance,
      commitSha: 'a1b2c3d',
      ref: 'main',
      status: ReleaseStatus.Queued,
      runNumber: null,
      createdAt: undefined,
    })
  })

  it('numbers a release by the run that opened it', async () => {
    await db.insert(report).values(aReport({ id: IDS.report, applicationId: IDS.application }))
    await db.insert(task).values(aTask({ id: IDS.task, applicationId: IDS.application, reportId: IDS.report, phase: TaskPhase.Verifying }))
    await db.insert(run).values(aRun({ id: IDS.run2, taskId: IDS.task, number: 2 }))
    await insertRelease(db, { id: IDS.release, instanceId: IDS.instance, runId: IDS.run2 })

    const found = await instances.find(IDS.org, IDS.instance)

    expect(found?.releases.map((entry) => entry.runNumber)).toEqual([2])
  })

  it('lists only the releases still queued or building, across instances, newest first', async () => {
    await insertInstance(db, { id: IDS.secondInstance, applicationId: IDS.application })
    await insertRelease(db, { id: IDS.release, instanceId: IDS.instance, status: ReleaseStatus.Queued, createdAt: EARLIER })
    await insertRelease(db, { id: IDS.secondRelease, instanceId: IDS.secondInstance, status: ReleaseStatus.Building, createdAt: LATER })
    await insertRelease(db, { instanceId: IDS.instance, status: ReleaseStatus.Live })

    expect((await releases.inFlight()).map((entry) => entry.id)).toEqual([IDS.secondRelease, IDS.release])
  })

  it('excludes a queued release whose instance has been torn down or expired', async () => {
    await insertInstance(db, { id: IDS.secondInstance, applicationId: IDS.application, status: InstanceStatus.TornDown })
    await insertRelease(db, { id: IDS.release, instanceId: IDS.instance, status: ReleaseStatus.Queued })
    await insertRelease(db, { id: IDS.secondRelease, instanceId: IDS.secondInstance, status: ReleaseStatus.Queued })

    expect((await releases.inFlight()).map((entry) => entry.id)).toEqual([IDS.release])
  })

  it('moves a release to a new status', async () => {
    await insertRelease(db, { id: IDS.release, instanceId: IDS.instance, status: ReleaseStatus.Building })

    await releases.setStatus(IDS.release, ReleaseStatus.Live)

    expect((await instances.find(IDS.org, IDS.instance))?.releases.map((entry) => entry.status)).toEqual([ReleaseStatus.Live])
  })
})
