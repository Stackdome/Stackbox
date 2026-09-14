import { ReleaseStatus } from '@stackbox/contract'
import type { DeployTarget } from '../ports'
import type { InstanceRef, ReleaseRef } from '../types'

export type FakeInstance = { applicationId: string; tornDown: boolean }
export type FakeRelease = { instanceId: string; commitSha: string; status: ReleaseStatus }

export class InMemoryDeployTarget implements DeployTarget {
  protected readonly instances = new Map<string, FakeInstance>()
  protected readonly releases = new Map<string, FakeRelease>()
  private settledStatus: ReleaseStatus = ReleaseStatus.Queued

  settleReleasesAs(status: ReleaseStatus): void {
    this.settledStatus = status
  }

  markLive(ref: ReleaseRef): void {
    this.release(ref).status = ReleaseStatus.Live
  }

  markFailed(ref: ReleaseRef): void {
    this.release(ref).status = ReleaseStatus.Failed
  }

  isTornDown(ref: InstanceRef): boolean {
    return this.instance(ref).tornDown
  }

  async createInstance(spec: Parameters<DeployTarget['createInstance']>[0]): Promise<InstanceRef> {
    const id = this.newInstanceId(this.instances.size + 1)
    this.instances.set(id, { applicationId: spec.applicationId, tornDown: false })
    return { id }
  }

  async deployRelease(ref: InstanceRef, spec: Parameters<DeployTarget['deployRelease']>[1]): Promise<ReleaseRef> {
    if (this.instance(ref).tornDown) throw new Error(`instance ${ref.id} is torn down`)
    const id = this.newReleaseId(this.releases.size + 1)
    this.releases.set(id, { instanceId: ref.id, commitSha: spec.commitSha, status: this.settledStatus })
    return { id }
  }

  protected newInstanceId(count: number): string {
    return `instance-${count}`
  }

  protected newReleaseId(count: number): string {
    return `release-${count}`
  }

  async releaseStatus(ref: ReleaseRef): Promise<{ status: ReleaseStatus }> {
    const found = this.release(ref)
    if (this.instance({ id: found.instanceId }).tornDown) return { status: ReleaseStatus.Failed }
    return { status: found.status }
  }

  async instanceUrl(ref: InstanceRef): Promise<string> {
    this.instance(ref)
    return `https://${ref.id}.instances.test`
  }

  async teardown(ref: InstanceRef): Promise<void> {
    this.instance(ref).tornDown = true
  }

  protected instance(ref: InstanceRef): FakeInstance {
    const found = this.instances.get(ref.id)
    if (!found) throw new Error(`unknown instance ${ref.id}`)
    return found
  }

  protected release(ref: ReleaseRef): FakeRelease {
    const found = this.releases.get(ref.id)
    if (!found) throw new Error(`unknown release ${ref.id}`)
    return found
  }
}
