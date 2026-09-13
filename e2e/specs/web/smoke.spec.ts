import { test, expect } from '@playwright/test'

test('the preview opens on Tasks inside the shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Instances' })).toBeVisible()
})
