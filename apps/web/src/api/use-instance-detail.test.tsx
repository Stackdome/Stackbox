// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { InstanceExpiryHours, ReleaseStatus } from '@stackbox/contract'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { INSTANCE_IDS, ORG_ID, PREVIEW_CATALOG_SEED } from '../../.storybook/fixtures'
import { buildCatalog, type PreviewCatalog } from '@/preview/handlers/catalog'
import { releaseErrorMessage } from './errors'
import { expiryLabel } from './mappers/instance'
import { useInstanceDetail } from './use-instance-detail'

const REFRESH_MS = 20
const WALK_MS = [150, 300] as const
const server = setupServer()
let catalog: PreviewCatalog

async function loaded(instanceId: string) {
  const hook = renderHook(() => useInstanceDetail(ORG_ID, instanceId, REFRESH_MS))
  await waitFor(() => expect(hook.result.current.data).not.toBeNull())
  return hook
}

describe('useInstanceDetail', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => {
    const built = buildCatalog(PREVIEW_CATALOG_SEED, { delayMs: 0, releaseWalkMs: WALK_MS })
    catalog = built.catalog
    server.resetHandlers(...built.handlers)
  })
  afterEach(() => catalog.dispose())

  it('deploy prepends a queued release that walks to live', async () => {
    const { result } = await loaded(INSTANCE_IDS.persistent)

    await act(async () => {
      await result.current.deploy()
    })
    const afterDeploy = result.current.data?.releases.map((release) => release.status)
    await waitFor(() => expect(result.current.data?.releases[0].status).toBe(ReleaseStatus.Live))

    expect([afterDeploy, result.current.data?.releases.length]).toEqual([[ReleaseStatus.Queued, ReleaseStatus.Live, ReleaseStatus.Live], 3])
  })

  it('refuses a second Deploy while the first is in flight, in the api words', async () => {
    const { result } = await loaded(INSTANCE_IDS.persistent)
    await act(async () => {
      await result.current.deploy()
    })

    const refused = await result.current.deploy().catch((error: unknown) => releaseErrorMessage(error))

    expect(refused).toBe('Wait for the release in flight to finish first')
  })

  it('reads the new expiry back once extended', async () => {
    const { result } = await loaded(INSTANCE_IDS.scratch)

    await act(async () => {
      await result.current.extendExpiry(InstanceExpiryHours.ThreeDays)
    })

    expect(expiryLabel(result.current.data?.expiresAt ?? null, Date.now()).text).toBe('in 71h')
  })
})
