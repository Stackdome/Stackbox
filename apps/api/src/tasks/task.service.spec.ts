import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { ArtifactKind, CoarseStatus, TaskKind, TaskPhase } from '@stackbox/contract'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import type { AuthUser } from '../access'
import { ApplicationStore } from '../db/application-store'
import { ArtifactStore } from '../db/artifact-store'
import type { Database } from '../db/client'
import { FIXTURE, seed } from '../db/seed'
import { TaskStore } from '../db/task-store'
import { UserStore } from '../db/user-store'
import { TaskService } from './task.service'

describe('TaskService', () => {
  let db: Database
  let service: TaskService
  let orgId: string

  beforeAll(async () => {
    db = await migratedTestDatabase()
    service = new TaskService(new TaskStore(db), new UserStore(db), new ArtifactStore(db))
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await seed(db, { passwordHash: 'scrypt$c2FsdA==$a2V5', now: new Date('2026-09-14T10:00:00Z') })
    orgId = (await new UserStore(db).findByEmail(FIXTURE.adminEmail))!.orgId
  })

  async function theAdminAndShop(): Promise<{ admin: AuthUser; shopId: string }> {
    const profile = (await new UserStore(db).findByEmail(FIXTURE.adminEmail))!
    const [shop] = (await new ApplicationStore(db).listByOrg(orgId)).filter((row) => row.name === 'shop')
    return { admin: { id: profile.id, orgId: profile.orgId, email: profile.email, orgRole: profile.orgRole }, shopId: shop.id }
  }

  it('counts the tasks that need you over the whole organization while filtering the items', async () => {
    const list = await service.list(orgId, { status: CoarseStatus.Failed })

    expect({ items: list.items.length, needsYou: list.needs_you_count }).toEqual({ items: 1, needsYou: 2 })
  })

  it('answers not found for a task the organization does not have', async () => {
    await expect(service.cancel(orgId, '00000000-0000-4000-8000-0000000000ff')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('refuses to cancel a task that has already finished', async () => {
    const finished = (await service.list(orgId, { status: CoarseStatus.ReadyForReview })).items[0]

    await expect(service.cancel(orgId, finished.id)).rejects.toBeInstanceOf(ConflictException)
  })

  it('answers the detail of a handed over task with its report and merged pull request', async () => {
    const [row] = (await service.list(orgId, { q: 'Password reset' })).items

    const detail = await service.get(orgId, row.id)

    expect({ description: detail.report?.description, pullRequests: detail.pull_requests.map((pull) => [pull.number, pull.repository_full_name]) }).toEqual({
      description: 'Password reset link expires immediately',
      pullRequests: [[142, 'acme/shop']],
    })
  })

  it('refuses a task whose kind is onboarding with a clear error naming the unsupported kind', async () => {
    const { admin, shopId } = await theAdminAndShop()

    const refused = await service
      .create(orgId, admin, { application_id: shopId, description: 'Set up the billing app.', kind: TaskKind.Onboarding })
      .catch((error: unknown) => error)

    expect(refused instanceof BadRequestException && refused.getResponse()).toEqual({
      code: 'unsupported_task_kind',
      message: 'Tasks of kind onboarding are not supported yet',
    })
  })

  it('creates a task in intake with the default run limit and the admin as reporter', async () => {
    const { admin, shopId } = await theAdminAndShop()

    const created = await service.create(orgId, admin, { application_id: shopId, description: 'The cart badge shows zero.' })

    expect({ phase: created.phase, runLimit: created.run_limit, reporter: created.report?.reporter }).toEqual({
      phase: TaskPhase.Intake,
      runLimit: 2,
      reporter: 'Ada Lovelace',
    })
  })

  it('attaches an uploaded screenshot to the report of the new task, typed from its bytes not the client mime', async () => {
    const { admin, shopId } = await theAdminAndShop()
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47])
    const image = await service.uploadScreenshot(orgId, { buffer: png, mimetype: 'application/octet-stream', size: png.length, originalname: 'cart.png' })

    const created = await service.create(orgId, admin, { application_id: shopId, description: 'The cart badge shows zero.', screenshot_artifact_id: image.id })

    expect(created.report?.screenshots.map((shot) => [shot.id, shot.kind, shot.url])).toEqual([
      [image.id, ArtifactKind.Screenshot, `data:image/png;base64,${png.toString('base64')}`],
    ])
  })

  it('refuses an upload whose bytes are not a real image, whatever mime type the client claims', async () => {
    await expect(
      service.uploadScreenshot(orgId, { buffer: Buffer.from('%PDF'), mimetype: 'image/png', size: 4, originalname: 'report.pdf' }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('answers not found for an artifact id that is not a uuid', async () => {
    await expect(service.artifact(orgId, 'not-a-uuid')).rejects.toBeInstanceOf(NotFoundException)
  })
})
