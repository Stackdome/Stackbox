import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { components } from '@stackbox/contract'
import { z } from 'zod'
import { ApplicationStore } from '../db'
import { CLOCK, type Clock } from '../ports'
import { RepositoryService } from '../repositories/repository.service'
import type { ProviderRepository } from '../repositories/types'
import { slugFrom } from './calc/slug'
import { DEFAULT_STACKFILE_PATH, type ParsedStackfile, stackfileOutcome } from './calc/stackfile'
import { APPLICATION_HAS_ACTIVE_TASKS, APPLICATION_HAS_LIVE_INSTANCES, APPLICATION_NOT_FOUND, SLUG_TAKEN } from './errors'
import { presentDetail, presentDetection, presentListItem, presentService } from './presenters'
import { type ApplicationRecord, RemoveOutcome } from './types'

type Schemas = components['schemas']

const uuid = z.string().uuid()

@Injectable()
export class ApplicationService {
  constructor(
    @Inject(ApplicationStore) private readonly applications: ApplicationStore,
    @Inject(RepositoryService) private readonly repositories: RepositoryService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async list(orgId: string): Promise<Schemas['ApplicationList']> {
    const records = await this.applications.listRecords(orgId)
    const heads = await this.headsOf(records.map((record) => record.repository))
    const items = records.map((record) => presentListItem(record, heads.get(record.repository.id) as string))
    return { items, total: items.length }
  }

  async detail(orgId: string, applicationId: string): Promise<Schemas['ApplicationDetail']> {
    const record = await this.recordOrThrow(orgId, applicationId)
    const [headSha, services] = await Promise.all([this.repositories.headSha(record.repository), this.applications.servicesOf(record.id)])
    return presentDetail(record, services, headSha)
  }

  async services(orgId: string, applicationId: string): Promise<Schemas['ServiceList']> {
    const record = await this.recordOrThrow(orgId, applicationId)
    return { items: (await this.applications.servicesOf(record.id)).map(presentService) }
  }

  async detect(orgId: string, input: Schemas['StackfileDetect']): Promise<Schemas['StackfileDetection']> {
    const repository = await this.repositories.locate(orgId, input.repository_id)
    const { sha, outcome } = await this.readStackfile(repository, input.stackfile_path ?? null)
    return presentDetection(sha, outcome)
  }

  async create(orgId: string, input: Schemas['ApplicationCreate']): Promise<Schemas['ApplicationDetail']> {
    const repository = await this.repositories.locate(orgId, input.repository_id)
    const id = await this.applications.create({
      orgId,
      name: input.name,
      slug: input.slug ?? slugFrom(input.name),
      repositoryId: repository.id,
      stackfilePath: input.stackfile_path ?? null,
    })
    if (!id) {
      throw new ConflictException(SLUG_TAKEN)
    }
    await this.syncRecord(await this.recordOrThrow(orgId, id))
    return this.detail(orgId, id)
  }

  async update(orgId: string, applicationId: string, input: Schemas['ApplicationUpdate']): Promise<Schemas['ApplicationDetail']> {
    const record = await this.recordOrThrow(orgId, applicationId)
    const movedPath = input.stackfile_path !== undefined && input.stackfile_path !== record.stackfilePath ? input.stackfile_path : undefined
    await this.applications.update(record.id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(movedPath !== undefined && { stackfilePath: movedPath }),
    })
    if (movedPath !== undefined) {
      await this.syncRecord({ ...record, stackfilePath: movedPath })
    }
    return this.detail(orgId, record.id)
  }

  async sync(orgId: string, applicationId: string): Promise<Schemas['ApplicationDetail']> {
    await this.syncRecord(await this.recordOrThrow(orgId, applicationId))
    return this.detail(orgId, applicationId)
  }

  async remove(orgId: string, applicationId: string): Promise<void> {
    const record = await this.recordOrThrow(orgId, applicationId)
    const outcome = await this.applications.removeIfIdle(record.id)
    if (outcome === RemoveOutcome.ActiveTasks) throw new ConflictException(APPLICATION_HAS_ACTIVE_TASKS)
    if (outcome === RemoveOutcome.LiveInstances) throw new ConflictException(APPLICATION_HAS_LIVE_INSTANCES)
  }

  private async syncRecord(record: ApplicationRecord): Promise<void> {
    const { sha, outcome } = await this.readStackfile(record.repository, record.stackfilePath)
    await this.applications.recordSync(
      record.id,
      record.repository.id,
      'error' in outcome ? outcome : { sha, validatedAt: this.clock.now(), services: outcome.services },
    )
  }

  private async readStackfile(repository: ProviderRepository, stackfilePath: string | null): Promise<{ sha: string; outcome: ParsedStackfile }> {
    const path = stackfilePath ?? DEFAULT_STACKFILE_PATH
    const sha = await this.repositories.headSha(repository)
    return { sha, outcome: stackfileOutcome(path, await this.repositories.readFile(repository, sha, path)) }
  }

  // ponytail: one headSha provider call per distinct repository on every list and detail read; cache head_sha on the repository row when the real adapter lands.
  private async headsOf(repositories: ProviderRepository[]): Promise<Map<string, string>> {
    const distinct = [...new Map(repositories.map((repository) => [repository.id, repository])).values()]
    const heads = await Promise.all(distinct.map(async (repository) => [repository.id, await this.repositories.headSha(repository)] as const))
    return new Map(heads)
  }

  private async recordOrThrow(orgId: string, applicationId: string): Promise<ApplicationRecord> {
    const record = uuid.safeParse(applicationId).success ? await this.applications.findRecord(orgId, applicationId) : null
    if (!record) {
      throw new NotFoundException(APPLICATION_NOT_FOUND)
    }
    return record
  }
}
