// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PREVIEW_CATALOG_SEED, makeUser } from '../../../.storybook/fixtures'
import { CurrentUserProvider } from '@/contexts/current-user-context'
import { ROUTES } from '@/lib/routes'
import { buildCatalog, type PreviewCatalog } from '@/preview/handlers/catalog'
import { SheetHost } from '@/test-support/sheet-host'
import { InstancesPage } from './instances-page'

const ROWS = '[data-slot="data-list-row"]'
const server = setupServer()
let catalog: PreviewCatalog

function renderList() {
  return render(
    <CurrentUserProvider>
      <MemoryRouter initialEntries={[ROUTES.instances]}>
        <SheetHost>
          <Routes>
            <Route path={ROUTES.instances} element={<InstancesPage />} />
            <Route path={ROUTES.instance} element={<p>the instance detail</p>} />
          </Routes>
        </SheetHost>
      </MemoryRouter>
    </CurrentUserProvider>,
  )
}

describe('the Instances page', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('currentUser', JSON.stringify(makeUser()))
    const built = buildCatalog(PREVIEW_CATALOG_SEED, { delayMs: 0 })
    catalog = built.catalog
    server.resetHandlers(...built.handlers)
  })
  afterEach(() => {
    cleanup()
    catalog.dispose()
  })

  it('lists the seven instances in use with their purpose, status and expiry, torn down ones hidden', async () => {
    const { container } = renderList()

    const persistent = await screen.findByRole('link', { name: 'shop · persistent 5e7d' })

    expect(container.querySelectorAll(ROWS)).toHaveLength(7)
    expect([within(persistent).getByText('Persistent'), within(persistent).getByText('Ready'), within(persistent).getByText('No expiry')].every(Boolean)).toBe(true)
  })

  it('reveals the torn down instance, muted, once Show torn down is on', async () => {
    const { container } = renderList()
    await screen.findByRole('link', { name: 'shop · persistent 5e7d' })

    await userEvent.click(screen.getByRole('switch', { name: 'Show torn down' }))

    const tornDown = await screen.findByRole('link', { name: 'shop · scratch 6f4b' })
    expect([container.querySelectorAll(ROWS).length, tornDown.getAttribute('data-muted')]).toEqual([8, 'true'])
  })

  it('narrows the rows to task instances with the purpose filter', async () => {
    const { container } = renderList()
    await screen.findByRole('link', { name: 'shop · persistent 5e7d' })

    await userEvent.click(within(screen.getByRole('radiogroup', { name: 'Purpose' })).getByRole('radio', { name: 'Task' }))

    await waitFor(() => expect(container.querySelectorAll(ROWS)).toHaveLength(3))
  })

  it('opens the detail when a row is clicked', async () => {
    renderList()

    await userEvent.click(await screen.findByRole('link', { name: 'billing · scratch 9b1c' }))

    expect(await screen.findByText('the instance detail')).toBeInTheDocument()
  })
})
