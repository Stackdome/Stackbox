import { expect, test } from '@playwright/test'
import { applicationCards, rows } from './selectors'

test('the cards view survives a reload', async ({ page }) => {
  await page.goto('/applications')
  await page.getByRole('radio', { name: 'Cards' }).click()
  await expect(page.locator(applicationCards)).toBeVisible()

  await page.reload()

  await expect(page.locator(applicationCards)).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Cards' })).toBeChecked()
})

test('search narrows the applications to the ones that match', async ({ page }) => {
  await page.goto('/applications')
  await expect(page.locator(rows)).toHaveCount(3)

  await page.getByRole('searchbox', { name: 'Search applications' }).fill('led')

  await expect(page.locator(rows)).toHaveCount(1)
  await expect(page.locator(rows)).toContainText('ledger')
})

test('connecting an application detects its services and lands on its Overview', async ({ page }) => {
  await page.goto('/applications/new')
  const next = page.getByRole('button', { name: 'Next' })
  await expect(next).toBeDisabled()

  await page.getByRole('combobox', { name: /Repository/ }).click()
  await page.getByRole('option', { name: 'acme/design-system' }).click()
  await next.click()
  await expect(page.getByRole('list', { name: 'Detected services' })).toContainText('acme/design-system/apps/api')
  await expect(page.getByRole('textbox', { name: /Name/ })).toHaveValue('design-system')
  await page.getByRole('button', { name: 'Finish' }).click()

  await expect(page).toHaveURL(/\/applications\/app-design-system$/)
  await expect(page.getByRole('tab', { name: 'Overview', selected: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rename design-system' })).toBeVisible()
})
