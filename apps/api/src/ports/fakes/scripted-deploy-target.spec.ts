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

  it('adopts an instance it has never seen and answers its url from the first eight characters of the id', async () => {
    const deploy = new ScriptedDeployTarget(new InMemoryClock(new Date('2026-09-13T10:00:00Z')))
    const seeded = { id: '4f2a0c1e-5b6d-4e7f-8a9b-0c1d2e3f4a50' }

    expect(await deploy.instanceUrl(seeded)).toBe('https://4f2a0c1e.instances.stackbox.test')
  })

  it('tears down an instance it has never seen and deploys onto one', async () => {
    const deploy = new ScriptedDeployTarget(new InMemoryClock(new Date('2026-09-13T10:00:00Z')))
    const seeded = { id: '7c3e1b2a-0000-4000-8000-000000000001' }
    const other = { id: '7c3e1b2a-0000-4000-8000-000000000002' }

    await deploy.teardown(seeded)
    const release = await deploy.deployRelease(other, { commitSha: 'demo-origin-sha', variables: {} })

    expect([deploy.isTornDown(seeded), (await deploy.releaseStatus(release)).status]).toEqual([true, ReleaseStatus.Queued])
  })

  it('walks a release it has never seen from the moment it first reads it', async () => {
    const clock = new InMemoryClock(new Date('2026-09-13T10:00:00Z'))
    const deploy = new ScriptedDeployTarget(clock)
    const seeded = { id: '2d9b4c6e-0000-4000-8000-000000000003' }

    const first = (await deploy.releaseStatus(seeded)).status
    clock.advance(3_000)
    const later = (await deploy.releaseStatus(seeded)).status

    expect([first, later]).toEqual([ReleaseStatus.Queued, ReleaseStatus.Live])
  })
})
