import { ReleaseStatus } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { InMemoryClock } from './in-memory-clock'
import { ScriptedDeployTarget } from './scripted-deploy-target'

describe('the scripted deploy target', () => {
  it('reports a release building after one second and live after three', async () => {
    const clock = new InMemoryClock(new Date('2026-09-13T10:00:00Z'))
    const deploy = new ScriptedDeployTarget(clock)
    const instance = await deploy.createInstance({ applicationId: 'A1', services: [], variables: {} })
    const release = await deploy.deployRelease(instance, { commitSha: 'origin-sha', variables: {} })
    clock.advance(1_000)
    const building = (await deploy.releaseStatus(release)).status
    clock.advance(2_000)
    const live = (await deploy.releaseStatus(release)).status
    expect([building, live]).toEqual([ReleaseStatus.Building, ReleaseStatus.Live])
  })
})
