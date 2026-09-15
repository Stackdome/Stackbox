// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { http, HttpResponse, delay } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { makeUser } from '../../.storybook/fixtures'
import { CurrentUserProvider } from '@/contexts/current-user-context'
import { SessionGate } from './session-gate'

const server = setupServer()

function renderGate() {
  render(
    <CurrentUserProvider>
      <SessionGate>
        <p>inside the shell</p>
      </SessionGate>
    </CurrentUserProvider>,
  )
}

describe('SessionGate', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => localStorage.clear())
  afterEach(() => cleanup())

  it('opens the shell once the api answers who is signed in', async () => {
    server.resetHandlers(http.get('*/api/v1/users/current', () => HttpResponse.json(makeUser())))

    renderGate()

    expect(await screen.findByText('inside the shell')).toBeInTheDocument()
  })

  it('opens the shell at once for a stored user while it checks the session again', () => {
    localStorage.setItem('currentUser', JSON.stringify(makeUser()))
    server.resetHandlers(
      http.get('*/api/v1/users/current', async () => {
        await delay('infinite')
        return HttpResponse.json(makeUser())
      }),
    )

    renderGate()

    expect(screen.getByText('inside the shell')).toBeInTheDocument()
  })
})
