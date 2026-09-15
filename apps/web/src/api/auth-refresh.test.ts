// @vitest-environment jsdom
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeUser } from '../../.storybook/fixtures'
import { refreshSession } from './auth-refresh'

let refreshes = 0
let bodies: string[] = []

const server = setupServer(
  http.post('*/api/v1/auth/refresh', async ({ request }) => {
    refreshes += 1
    bodies = [...bodies, await request.text()]
    return HttpResponse.json({ user: makeUser() })
  }),
)

describe('refreshSession', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())

  it('shares one bodiless refresh request between concurrent callers', async () => {
    await Promise.all([refreshSession(), refreshSession(), refreshSession()])

    expect([refreshes, bodies]).toEqual([1, ['']])
  })
})
