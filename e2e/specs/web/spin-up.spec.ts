import { expect, test } from '@playwright/test'
import { EMPTY_PREVIEW, instanceStatus } from './selectors'

const WALK_TIMEOUT_MS = 10_000

test('Persistent sets No expiry and disables the expiry control', async ({ page }) => {
  await page.goto('/instances')
  await page.getByRole('button', { name: 'Spin up', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Spin up application instance' })

  await drawer.getByRole('radio', { name: 'Persistent' }).click()

  await expect(drawer.getByRole('radio', { name: 'No expiry' })).toBeChecked()
  await expect(drawer.getByRole('radio', { name: '24h' })).toBeDisabled()
})

test('spinning up lands on the new instance provisioning, and it resolves to Ready', async ({ page }) => {
  await page.goto('/instances')
  await page.getByRole('button', { name: 'Spin up', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Spin up application instance' })

  await drawer.getByRole('combobox', { name: /Application/ }).click()
  await page.getByRole('option', { name: 'shop' }).click()
  await drawer.getByRole('button', { name: 'Spin up' }).click()

  await expect(page).toHaveURL(/\/instances\/[0-9a-f-]{36}$/)
  await expect(page.locator(instanceStatus)).toHaveText('Provisioning')
  await expect(page.locator(instanceStatus)).toHaveText('Ready', { timeout: WALK_TIMEOUT_MS })
})

test('opened from an application, the application is locked', async ({ page }) => {
  await page.goto('/applications/app-shop')

  await page.getByRole('button', { name: 'Spin up', exact: true }).click()

  const drawer = page.getByRole('dialog', { name: 'Spin up application instance' })
  await expect(drawer.getByRole('combobox', { name: /Application/ })).toBeDisabled()
  await expect(drawer.getByRole('combobox', { name: /Application/ })).toHaveText('shop')
})

test('with no applications the drawer is blocked', async ({ page }) => {
  await page.goto(`${EMPTY_PREVIEW}/instances`)

  await page.getByRole('button', { name: 'Spin up', exact: true }).click()

  const drawer = page.getByRole('dialog', { name: 'Spin up application instance' })
  await expect(drawer.getByRole('link', { name: 'Connect an application first' })).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Spin up' })).toBeDisabled()
})
