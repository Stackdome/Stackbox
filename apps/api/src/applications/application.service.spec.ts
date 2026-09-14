import { randomUUID } from 'node:crypto'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { InstanceStatus, ServiceKind, StackfileSync, TaskPhase, type components } from '@stackbox/contract'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { ApplicationStore } from '../db/application-store'
import type { Database } from '../db/client'
import { GitConnectionStore } from '../db/git-connection-store'
import { RepositoryStore } from '../db/repository-store'
import { task } from '../db/schema'
import { IDS, emptyTables, insertInstance, insertOrganization, insertRepository } from '../db/test-support/rows'
import { InMemoryClock, type InMemoryGitProvider } from '../ports/fakes'
import { RepositoryService } from '../repositories/repository.service'
import { aTask } from '../tasks/test-support/builders'
import { ApplicationService } from './application.service'
import { A_STACKFILE, SHOP_LISTED, aShopListing } from './test-support/builders'

const NOW = new Date('2026-09-14T10:00:00Z')
const HEAD = 'b2c3d4e5f60718293a4b5c6d7e8f901234567890'
const MOVED_HEAD = 'c3d4e5f60718293a4b5c6d7e8f90123456789012'

describe('ApplicationService', () => {
  let db: Database
  let git: InMemoryGitProvider
  let service: ApplicationService

  beforeAll(async () => {
    db = await migratedTestDatabase()
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org)
    await insertOrganization(db, IDS.otherOrg, 'globex')
    await insertRepository(db, { orgId: IDS.org, id: IDS.repository, name: 'shop', externalId: SHOP_LISTED.externalId })
    git = aShopListing(HEAD)
    service = new ApplicationService(
      new ApplicationStore(db),
      new RepositoryService(new GitConnectionStore(db), new RepositoryStore(db), git),
      new InMemoryClock(NOW),
    )
  })

  const createShop = (overrides: Partial<components['schemas']['ApplicationCreate']> = {}) =>
    service.create(IDS.org, { name: 'shop', repository_id: IDS.repository, ...overrides })

  it('creates an application synced at the head with the services its Stackfile declares', async () => {
    const created = await createShop()

    expect({
      sync: created.sync,
      sha: created.synced_at_sha,
      validatedAt: created.validated_at,
      services: created.services.map((row) => [row.name, row.kind, row.repository?.full_name ?? null]),
    }).toEqual({
      sync: StackfileSync.Synced,
      sha: HEAD,
      validatedAt: NOW.toISOString(),
      services: [
        ['api', ServiceKind.Source, 'acme/shop'],
        ['postgres', ServiceKind.Image, null],
      ],
    })
  })

  it('creates an application that reads validation_failed when its Stackfile is missing', async () => {
    const created = await createShop({ stackfile_path: 'admin/stackfile.yaml' })

    expect([created.sync, created.validation_error, created.services]).toEqual([
      StackfileSync.ValidationFailed,
      'Stackfile not found at admin/stackfile.yaml',
      [],
    ])
  })

  it('derives the slug from the name when none is given', async () => {
    expect((await createShop({ name: 'Shop Admin' })).slug).toBe('shop-admin')
  })

  it('refuses a slug another application already uses', async () => {
    await createShop()

    const refused = await createShop().catch((error: unknown) => error)

    expect(refused instanceof ConflictException && refused.getResponse()).toEqual({ code: 'slug_taken', message: 'Another application already uses this slug' })
  })

  it('refuses a repository of another organization', async () => {
    await insertRepository(db, { orgId: IDS.otherOrg, id: IDS.otherRepository, name: 'ledger' })

    const refused = await createShop({ repository_id: IDS.otherRepository }).catch((error: unknown) => error)

    expect(refused instanceof NotFoundException && refused.getResponse()).toEqual({
      code: 'unknown_repository',
      message: 'Repository not found in this organization or provider',
    })
  })

  it('clears the stale mark and stores the new sha when the application is re-synced', async () => {
    const created = await createShop()
    git.seedRepository({ summary: SHOP_LISTED, headSha: MOVED_HEAD, files: { 'stackfile.yaml': A_STACKFILE } })
    const stale = await service.detail(IDS.org, created.id)

    const resynced = await service.sync(IDS.org, created.id)

    expect({ before: stale.sync, after: resynced.sync, sha: resynced.synced_at_sha }).toEqual({
      before: StackfileSync.Stale,
      after: StackfileSync.Synced,
      sha: MOVED_HEAD,
    })
  })

  it('lists applications by name, each read against its repository head', async () => {
    await createShop()
    await createShop({ name: 'shop-admin', stackfile_path: 'admin/stackfile.yaml' })

    const list = await service.list(IDS.org)

    expect(list.items.map((item) => [item.name, item.sync, item.service_names])).toEqual([
      ['shop', StackfileSync.Synced, ['api', 'postgres']],
      ['shop-admin', StackfileSync.ValidationFailed, []],
    ])
  })

  it('detects the services of a Stackfile without creating an application', async () => {
    const detection = await service.detect(IDS.org, { repository_id: IDS.repository })

    expect({ names: detection.services.map((row) => row.name), error: detection.error, total: (await service.list(IDS.org)).total }).toEqual({
      names: ['api', 'postgres'],
      error: null,
      total: 0,
    })
  })

  it('syncs again when the Stackfile path moves', async () => {
    const created = await createShop()

    const moved = await service.update(IDS.org, created.id, { stackfile_path: 'admin/stackfile.yaml' })

    expect([moved.stackfile_path, moved.sync]).toEqual(['admin/stackfile.yaml', StackfileSync.ValidationFailed])
  })

  it('renames an application and leaves its sync alone', async () => {
    const created = await createShop()

    const renamed = await service.update(IDS.org, created.id, { name: 'storefront' })

    expect([renamed.name, renamed.sync]).toEqual(['storefront', StackfileSync.Synced])
  })

  it('refuses to delete an application while one of its tasks is still running', async () => {
    const created = await createShop()
    await db.insert(task).values(aTask({ id: randomUUID(), applicationId: created.id, reportId: null, phase: TaskPhase.Implementing }))

    const refused = await service.remove(IDS.org, created.id).catch((error: unknown) => error)

    expect(refused instanceof ConflictException && refused.getResponse()).toEqual({
      code: 'application_has_active_tasks',
      message: "Cancel or finish the application's running tasks first",
    })
  })

  it('refuses to delete an application while one of its instances is not torn down', async () => {
    const created = await createShop()
    await insertInstance(db, { id: IDS.instance, applicationId: created.id, status: InstanceStatus.Expired })

    const refused = await service.remove(IDS.org, created.id).catch((error: unknown) => error)

    expect(refused instanceof ConflictException && refused.getResponse()).toEqual({
      code: 'application_has_live_instances',
      message: "Tear down the application's instances first",
    })
  })

  it('answers not found for an application id that is not a uuid', async () => {
    await expect(service.detail(IDS.org, 'not-a-uuid')).rejects.toBeInstanceOf(NotFoundException)
  })
})
