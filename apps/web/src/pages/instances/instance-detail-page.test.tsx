// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { INSTANCE_IDS, PREVIEW_CATALOG_SEED, makeUser } from '../../../.storybook/fixtures'
import { ConfirmProvider } from '@/components/branded/confirm'
import { CurrentUserProvider } from '@/contexts/current-user-context'
import { ROUTES, instancePath } from '@/lib/routes'
import { buildCatalog, type PreviewCatalog } from '@/preview/handlers/catalog'
import { SheetHost } from '@/test-support/sheet-host'
import { InstanceDetailPage } from './instance-detail-page'

const STATUS_PILL = '[data-slot="instance-status"]'
const server = setupServer()
let catalog: PreviewCatalog

function renderDetail(instanceId: string) {
  render(
    <CurrentUserProvider>
      <ConfirmProvider>
        <MemoryRouter initialEntries={[instancePath(instanceId)]}>
          <SheetHost>
            <Routes>
              <Route path={ROUTES.instance} element={<InstanceDetailPage />} />
            </Routes>
          </SheetHost>
        </MemoryRouter>
      </ConfirmProvider>
    </CurrentUserProvider>,
  )
}

describe('the Instance detail page', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => {
    localStorage.setItem('currentUser', JSON.stringify(makeUser()))
    const built = buildCatalog(PREVIEW_CATALOG_SEED, { delayMs: 0 })
    catalog = built.catalog
    server.resetHandlers(...built.handlers)
  })
  afterEach(() => {
    cleanup()
    catalog.dispose()
  })

  it('tearing down sets the header to Torn down', async () => {
    renderDetail(INSTANCE_IDS.scratch)
    expect(await screen.findByText('Ready', { selector: STATUS_PILL })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Tear down' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Tear down' }))

    expect(await screen.findByText('Torn down', { selector: STATUS_PILL })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tear down' })).toBeNull()
  })

  it('reads No expiry and offers no Extend expiry on the persistent instance', async () => {
    renderDetail(INSTANCE_IDS.persistent)

    expect(await screen.findByText('No expiry', { selector: '[data-slot="expiry-text"]' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Extend expiry' })).toBeNull()
  })

  it('names the expiry in a banner and offers Spin up again on the expired instance', async () => {
    renderDetail(INSTANCE_IDS.taskExpired)

    expect(await screen.findByText('This instance expired 2h ago')).toBeInTheDocument()
    expect([screen.getByRole('button', { name: 'Spin up again' }), screen.getByRole('button', { name: 'Tear down' })].every(Boolean)).toBe(true)
  })

  it('blocks Deploy while the provisioning instance is building its release', async () => {
    renderDetail(INSTANCE_IDS.taskProvisioning)

    const releases = await screen.findByRole('region', { name: 'Releases' })

    expect(within(releases).getByRole('button', { name: 'Deploy' })).toBeDisabled()
  })
})
