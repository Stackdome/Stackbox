import { describe, expect, it } from 'vitest'
import { EnvironmentStatus } from '../types'
import { InMemoryClock } from './in-memory-clock'
import { ScriptedSandboxProvider } from './scripted-sandbox-provider'

function aProvisionedEnvironment() {
  const clock = new InMemoryClock(new Date('2026-09-13T10:00:00Z'))
  const sandboxes = new ScriptedSandboxProvider(clock)
  return { clock, sandboxes, environment: sandboxes.provision() }
}

describe('the scripted sandbox provider', () => {
  it('reports provisioning until the connect offset elapses', async () => {
    const { clock, sandboxes, environment } = aProvisionedEnvironment()
    clock.advance(999)
    expect(await sandboxes.status(environment)).toBe(EnvironmentStatus.Provisioning)
  })

  it('reports connected once the connect offset has elapsed', async () => {
    const { clock, sandboxes, environment } = aProvisionedEnvironment()
    clock.advance(1_000)
    expect(await sandboxes.status(environment)).toBe(EnvironmentStatus.Connected)
  })
})
