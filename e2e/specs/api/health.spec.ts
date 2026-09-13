import { test, expect } from '@playwright/test'

test('the health endpoint reports ok against a migrated database', async ({ request }) => {
  const response = await request.get('/api/v1/health')
  expect(response.ok()).toBe(true)
  expect(await response.json()).toEqual({ status: 'ok' })
})
