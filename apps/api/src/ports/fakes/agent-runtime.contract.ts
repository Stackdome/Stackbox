import { describe, expect, it } from 'vitest'
import { aRunSpec } from '../../tasks/test-support/builders'
import type { AgentRuntime, SandboxProvider } from '../ports'
import { EnvironmentStatus } from '../types'

export type AgentRuntimeContractSubject = { runtime: AgentRuntime; sandboxes: SandboxProvider }

export function describeAgentRuntimeContract(name: string, subject: () => AgentRuntimeContractSubject): void {
  describe(`${name} under the agent runtime contract`, () => {
    it('starts a run whose environment reports provisioning or connected', async () => {
      const { runtime, sandboxes } = subject()
      const { environment } = await runtime.startRun(aRunSpec())
      const status = environment ? await sandboxes.status(environment) : undefined
      expect([EnvironmentStatus.Provisioning, EnvironmentStatus.Connected]).toContain(status)
    })

    it('cancels a session a second time without an error', async () => {
      const { runtime } = subject()
      const { sessionId } = await runtime.startRun(aRunSpec())
      await runtime.cancel(sessionId)
      await expect(runtime.cancel(sessionId)).resolves.toBeUndefined()
    })

    it('deletes a session a second time without an error', async () => {
      const { runtime } = subject()
      const { sessionId } = await runtime.startRun(aRunSpec())
      await runtime.deleteSession(sessionId)
      await expect(runtime.deleteSession(sessionId)).resolves.toBeUndefined()
    })
  })
}
