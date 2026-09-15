// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { type AuthErrorDeps, handleResponseError } from './client'

function aSession(options: { refreshSucceeds: boolean; onAuthPage?: boolean }) {
  const calls = { refreshes: 0, retries: 0, signOuts: 0 }
  const deps: AuthErrorDeps = {
    refresh: async () => {
      calls.refreshes += 1
      if (!options.refreshSucceeds) throw new Error('refresh refused')
    },
    retry: async (config) => {
      calls.retries += 1
      return config
    },
    onAuthFailure: () => {
      calls.signOuts += 1
    },
    isAuthPage: () => options.onAuthPage ?? false,
  }
  return { calls, deps }
}

const failure = (status: number, config: Record<string, unknown> = {}) => ({ response: { status }, config })

describe('the api client on a refused request', () => {
  it('refreshes a lapsed session once and retries the request', async () => {
    const { calls, deps } = aSession({ refreshSucceeds: true })

    await handleResponseError(failure(401), deps)

    expect(calls).toEqual({ refreshes: 1, retries: 1, signOuts: 0 })
  })

  it('signs out when the refresh is refused, and does not retry', async () => {
    const { calls, deps } = aSession({ refreshSucceeds: false })

    await handleResponseError(failure(401), deps).catch(() => undefined)

    expect(calls).toEqual({ refreshes: 1, retries: 0, signOuts: 1 })
  })

  it('leaves a 401 answered on Sign in or Join to the page', async () => {
    const { calls, deps } = aSession({ refreshSucceeds: true, onAuthPage: true })

    await handleResponseError(failure(401), deps).catch(() => undefined)

    expect(calls).toEqual({ refreshes: 0, retries: 0, signOuts: 0 })
  })

  it('does not refresh again for a request it already retried', async () => {
    const { calls, deps } = aSession({ refreshSucceeds: true })

    await handleResponseError(failure(401, { _retry: true }), deps).catch(() => undefined)

    expect(calls).toEqual({ refreshes: 0, retries: 0, signOuts: 0 })
  })

  it('leaves a 403 alone: a refused permission is not a lapsed session', async () => {
    const { calls, deps } = aSession({ refreshSucceeds: true })

    await handleResponseError(failure(403), deps).catch(() => undefined)

    expect(calls).toEqual({ refreshes: 0, retries: 0, signOuts: 0 })
  })
})
