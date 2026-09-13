import { ReleaseStatus } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { InMemoryDeployTarget } from './in-memory-deploy-target'

async function anInstanceWithARelease(deploy: InMemoryDeployTarget) {
  const instance = await deploy.createInstance({ applicationId: 'A1', services: [], variables: {} })
  const release = await deploy.deployRelease(instance, { commitSha: 'origin-sha', variables: {} })
  return { instance, release }
}

describe('the in-memory deploy target', () => {
  it('reports a release live once the test marks it live', async () => {
    const deploy = new InMemoryDeployTarget()
    const { release } = await anInstanceWithARelease(deploy)
    deploy.markLive(release)
    expect(await deploy.releaseStatus(release)).toEqual({ status: ReleaseStatus.Live })
  })

  it('starts new releases in the status the test settled on', async () => {
    const deploy = new InMemoryDeployTarget()
    deploy.settleReleasesAs(ReleaseStatus.Failed)
    const { release } = await anInstanceWithARelease(deploy)
    expect(await deploy.releaseStatus(release)).toEqual({ status: ReleaseStatus.Failed })
  })

  it('tears down an already torn down instance without an error', async () => {
    const deploy = new InMemoryDeployTarget()
    const { instance } = await anInstanceWithARelease(deploy)
    await deploy.teardown(instance)
    await deploy.teardown(instance)
    expect(deploy.isTornDown(instance)).toBe(true)
  })
})
