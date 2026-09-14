import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ReleaseStatus, type components } from '@stackbox/contract'
import { z } from 'zod'
import { InstanceStore } from '../db/instance-store'
import { ReleaseStore } from '../db/release-store'
import { isRunning } from '../instances/calc/instance-status'
import type { InstanceRecord, ReleaseRecord } from '../instances/types'
import { DEPLOY_TARGET, type DeployTarget, GIT_PROVIDER, type GitProvider, UnknownRefError } from '../ports'
import type { ProviderRepository } from '../repositories/types'
import { advancedStatus, isInFlight } from './calc/release-progress'
import { INSTANCE_NOT_FOUND, INSTANCE_NOT_RUNNING, RELEASE_IN_FLIGHT, UNKNOWN_REF } from './errors'
import { presentRelease } from './presenters'

type Schemas = components['schemas']

const uuid = z.string().uuid()

@Injectable()
export class ReleaseService {
  constructor(
    @Inject(InstanceStore) private readonly instances: InstanceStore,
    @Inject(ReleaseStore) private readonly releases: ReleaseStore,
    @Inject(DEPLOY_TARGET) private readonly deploy: DeployTarget,
    @Inject(GIT_PROVIDER) private readonly git: GitProvider,
  ) {}

  async list(orgId: string, instanceId: string): Promise<Schemas['ReleaseList']> {
    const instance = await this.instanceOrThrow(orgId, instanceId)
    return { items: instance.releases.map(presentRelease) }
  }

  // ponytail: the in-flight check reads without a lock, so two concurrent Deploys can both pass; lock the instance row when that matters.
  async create(orgId: string, instanceId: string, input: Schemas['ReleaseCreate']): Promise<Schemas['Release']> {
    const instance = await this.instanceOrThrow(orgId, instanceId)
    if (!isRunning(instance.status)) throw new ConflictException(INSTANCE_NOT_RUNNING)
    if (instance.releases.some((release) => isInFlight(release.status))) throw new ConflictException(RELEASE_IN_FLIGHT)
    const ref = input.ref ?? instance.releases[0]?.ref ?? instance.repository.defaultBranch
    const commitSha = await this.resolveCommit(instance.repository, ref)
    return presentRelease(await this.open(instance.id, { commitSha, ref }))
  }

  async resolveCommit(repository: ProviderRepository, ref: string): Promise<string> {
    try {
      return await this.git.headSha({ id: repository.installationRef }, { id: repository.externalId }, ref)
    } catch (error: unknown) {
      if (!(error instanceof UnknownRefError)) throw error
      throw new NotFoundException(UNKNOWN_REF)
    }
  }

  async open(instanceId: string, commit: { commitSha: string; ref: string }): Promise<ReleaseRecord> {
    const deployed = await this.deploy.deployRelease({ id: instanceId }, { commitSha: commit.commitSha, ref: commit.ref, variables: {} })
    return this.releases.insert({ id: deployed.id, instanceId, commitSha: commit.commitSha, ref: commit.ref, status: ReleaseStatus.Queued })
  }

  async advance(release: ReleaseRecord): Promise<ReleaseStatus> {
    if (!isInFlight(release.status)) return release.status
    const observed = (await this.deploy.releaseStatus({ id: release.id })).status
    const next = advancedStatus(release.status, observed)
    if (next !== release.status) await this.releases.setStatus(release.id, next)
    return next
  }

  inFlight(): Promise<ReleaseRecord[]> {
    return this.releases.inFlight()
  }

  private async instanceOrThrow(orgId: string, instanceId: string): Promise<InstanceRecord> {
    const found = uuid.safeParse(instanceId).success ? await this.instances.find(orgId, instanceId) : null
    if (!found) throw new NotFoundException(INSTANCE_NOT_FOUND)
    return found
  }
}
