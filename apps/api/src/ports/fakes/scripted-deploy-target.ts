import { randomUUID } from 'node:crypto'
import { ReleaseStatus } from '@stackbox/contract'
import type { Clock, DeployTarget } from '../ports'
import type { InstanceRef, ReleaseRef } from '../types'
import { type FakeInstance, type FakeRelease, InMemoryDeployTarget } from './in-memory-deploy-target'

export type ReleaseStep = { afterMs: number; status: ReleaseStatus }

export const DEFAULT_RELEASE_SCRIPT: readonly ReleaseStep[] = [
  { afterMs: 0, status: ReleaseStatus.Queued },
  { afterMs: 1_000, status: ReleaseStatus.Building },
  { afterMs: 3_000, status: ReleaseStatus.Live },
]

const URL_ID_LENGTH = 8

// Seeded rows exist only in Postgres, so a ref this process never created is adopted on first sight.
const ADOPTED = 'adopted'

export class ScriptedDeployTarget extends InMemoryDeployTarget {
  private readonly deployedAt = new Map<string, number>()

  constructor(
    private readonly clock: Clock,
    private readonly steps: readonly ReleaseStep[] = DEFAULT_RELEASE_SCRIPT,
  ) {
    super()
  }

  override async deployRelease(ref: InstanceRef, spec: Parameters<DeployTarget['deployRelease']>[1]): Promise<ReleaseRef> {
    const release = await super.deployRelease(ref, spec)
    this.deployedAt.set(release.id, this.clock.now().getTime())
    return release
  }

  override async releaseStatus(ref: ReleaseRef): Promise<{ status: ReleaseStatus }> {
    this.release(ref)
    const elapsed = this.clock.now().getTime() - (this.deployedAt.get(ref.id) ?? 0)
    return { status: this.steps.filter((step) => step.afterMs <= elapsed).at(-1)?.status ?? ReleaseStatus.Queued }
  }

  override async instanceUrl(ref: InstanceRef): Promise<string> {
    this.instance(ref)
    return `https://${ref.id.slice(0, URL_ID_LENGTH)}.instances.stackbox.test`
  }

  // The scripted target backs Postgres rows, whose instance and release ids are uuids.
  protected override newInstanceId(): string {
    return randomUUID()
  }

  protected override newReleaseId(): string {
    return randomUUID()
  }

  protected override instance(ref: InstanceRef): FakeInstance {
    if (!this.instances.has(ref.id)) this.instances.set(ref.id, { applicationId: ADOPTED, tornDown: false })
    return super.instance(ref)
  }

  protected override release(ref: ReleaseRef): FakeRelease {
    if (!this.releases.has(ref.id)) {
      this.releases.set(ref.id, { instanceId: ADOPTED, commitSha: ADOPTED, status: ReleaseStatus.Queued })
      this.deployedAt.set(ref.id, this.clock.now().getTime())
    }
    return super.release(ref)
  }
}
