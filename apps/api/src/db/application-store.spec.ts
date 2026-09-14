import { randomUUID } from 'node:crypto'
import { ArtifactKind, ArtifactOwner, TaskPhase, TaskResolution } from '@stackbox/contract'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { aReport, aTask } from '../tasks/test-support/builders'
import { ApplicationStore } from './application-store'
import type { Database } from './client'
import { application, artifact, pullRequest, report, service, task } from './schema'
import { IDS, emptyTables, insertApplication, insertOrganization, insertRepository } from './test-support/rows'

const SYNCED_AT = new Date('2026-09-14T10:00:00Z')

describe('ApplicationStore', () => {
  let db: Database
  let store: ApplicationStore

  beforeAll(async () => {
    db = await migratedTestDatabase()
    store = new ApplicationStore(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org)
    await insertOrganization(db, IDS.otherOrg, 'globex')
  })

  async function aShopApplication(): Promise<string> {
    await insertRepository(db, { orgId: IDS.org, id: IDS.repository, name: 'shop', externalId: 'gh-1001' })
    const id = await store.create({ orgId: IDS.org, name: 'shop', slug: 'shop', repositoryId: IDS.repository, stackfilePath: null })
    return id as string
  }

  async function aTaskOf(applicationId: string, phase: TaskPhase): Promise<string> {
    const id = randomUUID()
    const resolution = phase === TaskPhase.HandOver ? TaskResolution.FixVerified : null
    await db.insert(task).values(aTask({ id, applicationId, reportId: null, phase, resolution }))
    return id
  }

  it('lists the applications of one organization by name', async () => {
    await insertApplication(db, { orgId: IDS.org, repositoryId: IDS.repository, id: IDS.application, name: 'shop' })
    await insertApplication(db, { orgId: IDS.otherOrg, repositoryId: IDS.otherRepository, id: IDS.otherApplication, name: 'ledger' })

    expect(await store.listByOrg(IDS.org)).toEqual([{ id: IDS.application, name: 'shop' }])
  })

  it('lists records by name with the repository installation, the service names and the task count', async () => {
    const shop = await aShopApplication()
    await store.recordSync(shop, IDS.repository, {
      sha: 'origin-sha',
      validatedAt: SYNCED_AT,
      services: [
        { name: 'web', path: 'apps/web', image: null, port: null },
        { name: 'api', path: 'apps/api', image: null, port: null },
      ],
    })
    await aTaskOf(shop, TaskPhase.Implementing)
    await aTaskOf(shop, TaskPhase.Cancelled)

    const [record] = await store.listRecords(IDS.org)

    expect({ installation: record.repository.installationRef, names: record.serviceNames, tasks: record.taskCount }).toEqual({
      installation: 'acme-installation',
      names: ['api', 'web'],
      tasks: 2,
    })
  })

  it('replaces the services and stores the sha when a sync succeeds', async () => {
    const shop = await aShopApplication()
    await store.recordSync(shop, IDS.repository, { sha: 'first', validatedAt: SYNCED_AT, services: [{ name: 'old', path: 'old', image: null, port: null }] })

    await store.recordSync(shop, IDS.repository, {
      sha: 'second',
      validatedAt: SYNCED_AT,
      services: [
        { name: 'api', path: 'apps/api', image: null, port: 3000 },
        { name: 'postgres', path: null, image: 'postgres:17', port: null },
      ],
    })

    const [record, services] = await Promise.all([store.findRecord(IDS.org, shop), store.servicesOf(shop)])
    expect({
      sha: record?.syncedAtSha,
      services: services.map((row) => [row.name, row.repository?.fullName ?? null]),
    }).toEqual({ sha: 'second', services: [['api', 'acme/shop'], ['postgres', null]] })
  })

  it('keeps the services and the synced sha when a sync fails, recording only the error', async () => {
    const shop = await aShopApplication()
    await store.recordSync(shop, IDS.repository, { sha: 'first', validatedAt: SYNCED_AT, services: [{ name: 'api', path: 'apps/api', image: null, port: null }] })

    await store.recordSync(shop, IDS.repository, { error: 'Stackfile not found at stackfile.yaml' })

    const record = await store.findRecord(IDS.org, shop)
    expect([record?.syncedAtSha, record?.validationError, record?.serviceNames]).toEqual(['first', 'Stackfile not found at stackfile.yaml', ['api']])
  })

  it('refuses to create a second application with a slug the organization already uses', async () => {
    await aShopApplication()

    expect(await store.create({ orgId: IDS.org, name: 'Shop', slug: 'shop', repositoryId: IDS.repository, stackfilePath: 'admin/stackfile.yaml' })).toBeNull()
  })

  it('refuses to remove an application while one of its tasks has not finished', async () => {
    const shop = await aShopApplication()
    await aTaskOf(shop, TaskPhase.NeedsInput)

    expect([await store.removeIfIdle(shop), (await store.findRecord(IDS.org, shop))?.id]).toEqual([false, shop])
  })

  it('removes an idle application together with its pull requests and report artifacts', async () => {
    const shop = await aShopApplication()
    const [written] = await db.insert(report).values(aReport({ id: randomUUID(), applicationId: shop })).returning({ id: report.id })
    const taskId = await aTaskOf(shop, TaskPhase.HandOver)
    await db.insert(pullRequest).values({ taskId, repositoryId: IDS.repository, number: 142 })
    await db.insert(artifact).values({ ownerType: ArtifactOwner.Report, ownerId: written.id, kind: ArtifactKind.Screenshot, url: 'data:image/png;base64,AA==' })

    const removed = await store.removeIfIdle(shop)

    const left = await Promise.all([
      db.select().from(application).where(eq(application.id, shop)),
      db.select().from(pullRequest),
      db.select().from(artifact),
      db.select().from(service),
    ])
    expect([removed, ...left.map((rows) => rows.length)]).toEqual([true, 0, 0, 0, 0])
  })
})
