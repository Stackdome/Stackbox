// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PREVIEW_ACCOUNTS_SEED, PREVIEW_PASSWORD, makeUser } from '../../../.storybook/fixtures'
import { ROUTES } from '@/lib/routes'
import { PreviewAccounts, accountHandlers, sessionGate } from '@/preview/handlers/accounts'
import { SignInPage } from './sign-in-page'

const server = setupServer()
let accounts: PreviewAccounts

function renderSignIn() {
  window.history.pushState({}, '', ROUTES.login)
  render(
    <MemoryRouter initialEntries={[ROUTES.login]}>
      <Routes>
        <Route path={ROUTES.login} element={<SignInPage />} />
        <Route path={ROUTES.tasks} element={<p>Tasks landing</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function signInWith(email: string, password: string) {
  await userEvent.type(screen.getByLabelText(/^Email/), email)
  await userEvent.type(screen.getByLabelText(/^Password/), password)
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('the Sign in page', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => {
    localStorage.clear()
    accounts = new PreviewAccounts(PREVIEW_ACCOUNTS_SEED)
    accounts.signOut()
    server.resetHandlers(sessionGate(accounts), ...accountHandlers(accounts))
  })
  afterEach(() => cleanup())

  it('signs the fixture admin in and lands on Tasks', async () => {
    renderSignIn()

    await signInWith('ada@example.com', PREVIEW_PASSWORD)

    expect(await screen.findByText('Tasks landing')).toBeInTheDocument()
  })

  it('shows a wrong password as a line under the form and stays on Sign in', async () => {
    renderSignIn()

    await signInWith('ada@example.com', 'not the password')

    expect(await screen.findByText('The email or password is not right')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('asks which organization when the email matches in two, and signs in to the one picked', async () => {
    server.use(
      http.post('*/api/v1/auth/login', async ({ request }) => {
        const body = (await request.json()) as { organization_id?: string }
        if (body.organization_id === 'org-2') return HttpResponse.json({ user: makeUser({ organization: { id: 'org-2', name: 'globex' } }) })
        return HttpResponse.json(
          { code: 'choose_organization', message: 'Choose the organization to sign in to', details: { organizations: [{ id: 'org-1', name: 'acme' }, { id: 'org-2', name: 'globex' }] } },
          { status: 409 },
        )
      }),
    )
    renderSignIn()

    await signInWith('ada@example.com', PREVIEW_PASSWORD)
    await userEvent.click(await screen.findByRole('radio', { name: 'globex' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Tasks landing')).toBeInTheDocument()
  })

  it('skips Sign in when a session already answers', async () => {
    accounts.signIn({ email: 'ada@example.com', password: PREVIEW_PASSWORD })

    renderSignIn()

    expect(await screen.findByText('Tasks landing')).toBeInTheDocument()
  })
})
