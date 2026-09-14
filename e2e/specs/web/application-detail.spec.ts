import { expect, test } from '@playwright/test'
import { rows, serviceRows } from './selectors'

test('re-sync clears the stale mark and moves the synced sha to the head', async ({ page }) => {
  await page.goto('/applications/app-billing')
  const stackfile = page.getByRole('region', { name: 'Stackfile' })
  await expect(stackfile).toContainText('Not synced since a1b2c3d')

  await stackfile.getByRole('button', { name: 'Re-sync' }).click()

  await expect(stackfile).toContainText('9f8e7d6')
  await expect(stackfile).not.toContainText('Not synced since')
  await expect(page.getByText('Stale', { exact: true })).toHaveCount(0)
})

test('a rename survives a reload', async ({ page }) => {
  await page.goto('/applications/app-billing')
  await page.getByRole('button', { name: 'Rename billing' }).click()
  const field = page.getByRole('textbox', { name: 'Name' })

  await field.fill('invoicing')
  await field.press('Enter')
  await expect(page.getByRole('button', { name: 'Rename invoicing' })).toBeVisible()
  await page.reload()

  await expect(page.getByRole('button', { name: 'Rename invoicing' })).toBeVisible()
})

test('the Services tab lists each service with its source', async ({ page }) => {
  await page.goto('/applications/app-shop')

  await page.getByRole('tab', { name: 'Services' }).click()

  await expect(page.locator(serviceRows)).toHaveCount(4)
  await expect(page.locator(serviceRows).first()).toContainText('acme/shop/apps/api')
  await expect(page.locator(serviceRows).last()).toContainText('postgres:17')
})

test('disconnecting asks for the slug and returns to the list without the application', async ({ page }) => {
  await page.goto('/applications/app-ledger')
  await page.getByRole('tab', { name: 'Config' }).click()
  await page.getByRole('button', { name: 'Disconnect application' }).click()
  const confirm = page.getByRole('alertdialog')
  const commit = confirm.getByRole('button', { name: 'Disconnect application' })
  await expect(commit).toBeDisabled()

  await confirm.getByLabel('Type ledger to confirm').fill('ledger')
  await commit.click()

  await expect(page).toHaveURL(/\/applications$/)
  await expect(page.locator(rows)).toHaveCount(2)
  await expect(page.locator(rows).filter({ hasText: 'ledger' })).toHaveCount(0)
})
