// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('shows Stackbox did not load when nothing is stored and the check fails, and Try again retries', async () => {
    let calls = 0
    server.resetHandlers(
      http.get('*/api/v1/users/current', () => {
        calls += 1
        return calls === 1 ? HttpResponse.json({ code: 'bad_gateway', message: 'bad gateway' }, { status: 502 }) : HttpResponse.json(makeUser())
      }),
    )

    renderGate()

    expect(await screen.findByText('Stackbox did not load')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('inside the shell')).toBeInTheDocument()
  })
})
