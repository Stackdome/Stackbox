// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import { InstanceExpiryHours, InstancePurpose, InstanceStatus } from '@stackbox/contract'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ORG_ID, PREVIEW_CATALOG_SEED } from '../../.storybook/fixtures'
import { buildCatalog, type PreviewCatalog } from '@/preview/handlers/catalog'
import { useInstances, useSpinUp } from './use-instances'

const server = setupServer()
let catalog: PreviewCatalog

describe('the instance list hooks', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => {
    const built = buildCatalog(PREVIEW_CATALOG_SEED, { delayMs: 0 })
    catalog = built.catalog
    server.resetHandlers(...built.handlers)
  })
  afterEach(() => catalog.dispose())

  it('leaves torn down instances out until asked for them', async () => {
    const hidden = renderHook(() => useInstances(ORG_ID))
    const shown = renderHook(() => useInstances(ORG_ID, { includeTornDown: true }))

    await waitFor(() => expect([hidden.result.current.loading, shown.result.current.loading]).toEqual([false, false]))

    expect([hidden.result.current.instances.length, shown.result.current.instances.length]).toEqual([7, 8])
  })

  it('narrows the list to one application', async () => {
    const { result } = renderHook(() => useInstances(ORG_ID, { applicationId: 'app-billing' }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.instances.map((instance) => instance.title)).toEqual(['billing · task 4f2a', 'billing · scratch 9b1c', 'billing · load test 3a6c'])
  })

  it('spins an instance up and answers its id, provisioning', async () => {
    const { result } = renderHook(() => useSpinUp(ORG_ID))

    const id = await result.current({ applicationId: 'app-shop', purpose: InstancePurpose.Preview, ref: '', expiry: InstanceExpiryHours.Day })

    expect(catalog.instance(id)?.status).toBe(InstanceStatus.Provisioning)
  })
})
