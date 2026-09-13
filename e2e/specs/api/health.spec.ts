import { test, expect } from '@playwright/test'

test('the health endpoint answers 200 with ok against a migrated database', async ({ request }) => {
  const response = await request.get('/api/v1/health')
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ status: 'ok' })
})
