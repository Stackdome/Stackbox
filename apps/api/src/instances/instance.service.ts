import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { InstancePurpose, InstanceStatus, type components } from '@stackbox/contract'
import { z } from 'zod'
import type { AuthUser } from '../access'
import type { ServiceRecord } from '../applications/types'
import { ApplicationStore } from '../db/application-store'
import { InstanceStore } from '../db/instance-store'
import { CLOCK, type Clock, DEPLOY_TARGET, type DeployTarget, type ServiceSpec } from '../ports'
import { ReleaseService } from '../releases/release.service'
import { expiresAtFor, hoursAfter } from './calc/expiry'
import { isRunning } from './calc/instance-status'
import { hasServicesToRun } from './calc/spin-up'
import {
  APPLICATION_NOT_SYNCED,
  INSTANCE_HAS_NO_EXPIRY,
  INSTANCE_NOT_FOUND,
  INSTANCE_NOT_RUNNING,
  PURPOSE_RESERVED,
  UNKNOWN_APPLICATION,
} from './errors'
import { presentDetail, presentListItem } from './presenters'
import type { InstanceRecord } from './types'

type Schemas = components['schemas']

const uuid = z.string().uuid()

function toServiceSpec(service: ServiceRecord): ServiceSpec {
  return { name: service.name, ...(service.path !== null && { path: service.path }), ...(service.image !== null && { image: service.image }) }
}

@Injectable()
export class InstanceService {
  constructor(
    @Inject(InstanceStore) private readonly instances: InstanceStore,
    @Inject(ApplicationStore) private readonly applications: ApplicationStore,
    @Inject(ReleaseService) private readonly releases: ReleaseService,
    @Inject(DEPLOY_TARGET) private readonly deploy: DeployTarget,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async list(orgId: string, query: { applicationId?: string; includeTornDown: boolean }): Promise<Schemas['InstanceList']> {
    if (query.applicationId !== undefined && !uuid.safeParse(query.applicationId).success) return { items: [], total: 0 }
    const items = (await this.instances.list(orgId, query)).map(presentListItem)
    return { items, total: items.length }
  }

  async detail(orgId: string, instanceId: string): Promise<Schemas['InstanceDetail']> {
    return presentDetail(await this.recordOrThrow(orgId, instanceId))
  }

  async spinUp(orgId: string, user: AuthUser, input: Schemas['InstanceSpinUp']): Promise<Schemas['InstanceDetail']> {
    if (input.purpose === InstancePurpose.Task) throw new BadRequestException(PURPOSE_RESERVED)
    const application = await this.applications.findRecord(orgId, input.application_id)
    if (!application) throw new NotFoundException(UNKNOWN_APPLICATION)
    if (!hasServicesToRun(application)) throw new ConflictException(APPLICATION_NOT_SYNCED)
    const ref = input.ref ?? application.repository.defaultBranch
    const commitSha = await this.releases.resolveCommit(application.repository, ref)
    const services = await this.applications.servicesOf(application.id)
    const created = await this.deploy.createInstance({ applicationId: application.id, services: services.map(toServiceSpec), variables: {} })
    await this.instances.insert({
      id: created.id,
      applicationId: application.id,
      purpose: input.purpose,
      createdBy: user.id,
      url: await this.deploy.instanceUrl(created),
      expiresAt: expiresAtFor(input.purpose, input.expires_in_hours, this.clock.now()),
    })
    await this.releases.open(created.id, { commitSha, ref })
    return this.detail(orgId, created.id)
  }

  async teardown(orgId: string, instanceId: string): Promise<Schemas['InstanceDetail']> {
    const record = await this.recordOrThrow(orgId, instanceId)
    if (record.status !== InstanceStatus.TornDown) {
      await this.deploy.teardown({ id: record.id })
      await this.instances.setStatus(record.id, InstanceStatus.TornDown)
    }
    return this.detail(orgId, record.id)
  }

  async extendExpiry(orgId: string, instanceId: string, input: Schemas['InstanceExpiryExtend']): Promise<Schemas['InstanceDetail']> {
    const record = await this.recordOrThrow(orgId, instanceId)
    if (record.purpose === InstancePurpose.Persistent) throw new ConflictException(INSTANCE_HAS_NO_EXPIRY)
    if (!isRunning(record.status)) throw new ConflictException(INSTANCE_NOT_RUNNING)
    await this.instances.setExpiry(record.id, hoursAfter(this.clock.now(), input.hours))
    return this.detail(orgId, record.id)
  }

  private async recordOrThrow(orgId: string, instanceId: string): Promise<InstanceRecord> {
    const record = uuid.safeParse(instanceId).success ? await this.instances.find(orgId, instanceId) : null
    if (!record) throw new NotFoundException(INSTANCE_NOT_FOUND)
    return record
  }
}
