import { ReleaseStatus } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { InMemoryClock } from './in-memory-clock'
import { ScriptedClock } from './scripted-clock'
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

  it('gives instances and releases uuid ids a database row can reference', async () => {
    const target = new ScriptedDeployTarget(new ScriptedClock())

    const instance = await target.createInstance({ applicationId: 'A1', services: [], variables: {} })
    const release = await target.deployRelease(instance, { commitSha: 'demo-origin-sha', variables: {} })

    expect([instance.id, release.id].every((id) => /^[0-9a-f-]{36}$/.test(id))).toBe(true)
  })
})
