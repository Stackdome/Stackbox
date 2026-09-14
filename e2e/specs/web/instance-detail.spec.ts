import { expect, test } from '@playwright/test'
import { expiryText, instanceStatus } from './selectors'

const PERSISTENT = '/instances/5e7d9f1b-3c5a-4e7c-9d1f-3a5b7c9d1e3f'
const SCRATCH = '/instances/9b1c0d2e-3f40-4a51-8b62-7c83d94ea5f6'
const PREVIEW = '/instances/8a1f3e5d-7b9c-4d0e-8f1a-2b3c4d5e6f70'
const EXPIRED = '/instances/2d9b4c6e-8f10-4a21-9b32-c4d5e6f70812'
const WALK_TIMEOUT_MS = 10_000

test('Deploy prepends a Queued release that walks to Live', async ({ page }) => {
  await page.goto(PERSISTENT)
  const releases = page.getByRole('region', { name: 'Releases' })
  await expect(releases.getByRole('listitem')).toHaveCount(2)

  await releases.getByRole('button', { name: 'Deploy' }).click()

  await expect(releases.getByRole('listitem')).toHaveCount(3)
  await expect(releases.getByRole('listitem').first()).toContainText('Queued')
  await expect(releases.getByRole('listitem').first()).toContainText('Live', { timeout: WALK_TIMEOUT_MS })
})

test('Tear down asks first, then the header reads Torn down', async ({ page }) => {
  await page.goto(SCRATCH)
  await expect(page.locator(instanceStatus)).toHaveText('Ready')

  await page.getByRole('button', { name: 'Tear down' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Tear down' }).click()

  await expect(page.locator(instanceStatus)).toHaveText('Torn down')
  await expect(page.getByRole('button', { name: 'Tear down' })).toHaveCount(0)
})

test('Extend expiry updates the expiry text', async ({ page }) => {
  await page.goto(PREVIEW)
  await expect(page.locator(expiryText).first()).toHaveText(/in (19|20)h/)

  await page.getByRole('button', { name: 'Extend expiry' }).click()
  await page.getByRole('menuitem', { name: '72h' }).click()

  await expect(page.locator(expiryText).first()).toHaveText('in 71h')
})

test('the persistent instance reads No expiry and offers no Extend expiry', async ({ page }) => {
  await page.goto(PERSISTENT)

  await expect(page.locator(expiryText).first()).toHaveText('No expiry')
  await expect(page.getByRole('button', { name: 'Extend expiry' })).toHaveCount(0)
})

test('the expired instance names its expiry in a banner and offers Spin up again', async ({ page }) => {
  await page.goto(EXPIRED)

  await expect(page.getByText('This instance expired 2h ago')).toBeVisible()
  await page.getByRole('button', { name: 'Spin up again' }).click()

  const drawer = page.getByRole('dialog', { name: 'Spin up application instance' })
  await expect(drawer.getByRole('combobox', { name: /Application/ })).toHaveText('shop')
  await expect(drawer.getByRole('radio', { name: 'Scratch' })).toBeChecked()
})
