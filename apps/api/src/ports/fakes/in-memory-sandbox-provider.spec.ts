import { describe, expect, it } from 'vitest'
import { EnvironmentStatus } from '../types'
import { InMemorySandboxProvider } from './in-memory-sandbox-provider'

describe('the in-memory sandbox provider', () => {
  it('reports provisioning for a newly provisioned environment', async () => {
    const sandboxes = new InMemorySandboxProvider()
    expect(await sandboxes.status(sandboxes.provision())).toBe(EnvironmentStatus.Provisioning)
  })

  it('reads back a file written into the environment', async () => {
    const sandboxes = new InMemorySandboxProvider()
    const environment = sandboxes.provision()
    await sandboxes.writeFile(environment, '/workspace/outputs/fix.patch', Buffer.from('patch'))
    expect((await sandboxes.readFile(environment, '/workspace/outputs/fix.patch')).toString()).toBe('patch')
  })

  it('destroys an already destroyed environment without an error', async () => {
    const sandboxes = new InMemorySandboxProvider()
    const environment = sandboxes.provision()
    await sandboxes.destroy(environment)
    await sandboxes.destroy(environment)
    expect(sandboxes.isDestroyed(environment)).toBe(true)
  })
})
