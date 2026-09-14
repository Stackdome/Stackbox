import { InstancePurpose, InstanceStatus, ReleaseStatus, type TaskPhase } from '@stackbox/contract'
import type { InstanceRecord, ReleaseRecord } from '../types'

const AT = new Date('2026-09-14T10:00:00Z')

export function aReleaseRecord(overrides: Partial<ReleaseRecord> = {}): ReleaseRecord {
  return {
    id: 'L1',
    instanceId: 'I1',
    commitSha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
    ref: 'main',
    status: ReleaseStatus.Live,
    runNumber: null,
    createdAt: AT,
    ...overrides,
  }
}

class InstanceRecordBuilder {
  private record: InstanceRecord = {
    id: 'I1',
    orgId: 'O1',
    application: { id: 'A1', name: 'shop' },
    repository: { id: 'R1', fullName: 'acme/shop', defaultBranch: 'main', externalId: 'gh-1001', installationRef: 'acme' },
    purpose: InstancePurpose.Scratch,
    status: InstanceStatus.Ready,
    url: 'https://i1.instances.test',
    owner: { id: 'U1', name: 'Ada Lovelace' },
    task: null,
    expiresAt: null,
    createdAt: AT,
    releases: [],
  }

  withPurpose(purpose: InstancePurpose): this {
    return this.with({ purpose })
  }

  withStatus(status: InstanceStatus): this {
    return this.with({ status })
  }

  withExpiry(expiresAt: Date | null): this {
    return this.with({ expiresAt })
  }

  withReleases(...releases: ReleaseRecord[]): this {
    return this.with({ releases })
  }

  ownedByTask(task: { id: string; description: string; phase: TaskPhase }): this {
    return this.with({ purpose: InstancePurpose.Task, task, owner: null })
  }

  build(): InstanceRecord {
    return this.record
  }

  private with(patch: Partial<InstanceRecord>): this {
    this.record = { ...this.record, ...patch }
    return this
  }
}

export function anInstance(): InstanceRecordBuilder {
  return new InstanceRecordBuilder()
}
