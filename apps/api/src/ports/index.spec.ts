import { describe, expect, it } from 'vitest'
import { AGENT_RUNTIME, CLOCK, DEPLOY_TARGET, GIT_PROVIDER, SANDBOX_PROVIDER } from './index'

describe('the ports barrel', () => {
  it('exposes one distinct injection token per port', () => {
    const tokens = new Set([SANDBOX_PROVIDER, AGENT_RUNTIME, DEPLOY_TARGET, GIT_PROVIDER, CLOCK])
    expect(tokens.size).toBe(5)
  })
})
