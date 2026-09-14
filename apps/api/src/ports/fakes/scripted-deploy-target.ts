import { randomUUID } from 'node:crypto'
import { ReleaseStatus } from '@stackbox/contract'
import type { Clock, DeployTarget } from '../ports'
import type { InstanceRef, ReleaseRef } from '../types'
import { InMemoryDeployTarget } from './in-memory-deploy-target'

export type ReleaseStep = { afterMs: number; status: ReleaseStatus }

export const DEFAULT_RELEASE_SCRIPT: readonly ReleaseStep[] = [
  { afterMs: 0, status: ReleaseStatus.Queued },
  { afterMs: 1_000, status: ReleaseStatus.Building },
  { afterMs: 3_000, status: ReleaseStatus.Live },
]

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

  // The scripted target backs Postgres rows, whose instance and release ids are uuids.
  protected override newInstanceId(): string {
    return randomUUID()
  }

  protected override newReleaseId(): string {
    return randomUUID()
  }
}
