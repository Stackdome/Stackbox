import { test, expect } from '@playwright/test'

test('the preview serves a page whose heading names the product', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Stackbox' })).toBeVisible()
})
