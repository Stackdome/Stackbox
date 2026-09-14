import { expect, test } from '@playwright/test'
import { instanceRows, instanceStatus } from './selectors'

test('the list shows each instance in use with its purpose, status and expiry', async ({ page }) => {
  await page.goto('/instances')

  await expect(page.locator(instanceRows)).toHaveCount(7)
  const persistent = page.getByRole('link', { name: 'shop · persistent 5e7d' })
  await expect(persistent).toContainText('Persistent')
  await expect(persistent).toContainText('Ready')
  await expect(persistent).toContainText('No expiry')
})

test('the purpose filter narrows the list to task instances', async ({ page }) => {
  await page.goto('/instances')
  await expect(page.locator(instanceRows)).toHaveCount(7)

  await page.getByRole('radiogroup', { name: 'Purpose' }).getByRole('radio', { name: 'Task' }).click()

  await expect(page.locator(instanceRows)).toHaveCount(3)
})

test('Show torn down reveals the torn down instance, muted', async ({ page }) => {
  await page.goto('/instances')
  await expect(page.locator(instanceRows)).toHaveCount(7)

  await page.getByRole('switch', { name: 'Show torn down' }).click()

  await expect(page.locator(instanceRows)).toHaveCount(8)
  await expect(page.locator(`${instanceRows}[data-muted="true"]`)).toContainText('Torn down')
})

test('clicking a row opens the instance', async ({ page }) => {
  await page.goto('/instances')

  await page.getByRole('link', { name: 'billing · scratch 9b1c' }).click()

  await expect(page).toHaveURL(/\/instances\/9b1c0d2e-3f40-4a51-8b62-7c83d94ea5f6$/)
  await expect(page.locator(instanceStatus)).toHaveText('Ready')
})

test('the url is its own link and opens a new tab without opening the row', async ({ page, context }) => {
  await page.goto('/instances')
  const url = page.getByRole('link', { name: 'https://5e7d9f1b.instances.stackbox.test' })
  await expect(url).toHaveAttribute('target', '_blank')

  const [tab] = await Promise.all([context.waitForEvent('page'), url.click()])

  expect(tab).toBeTruthy()
  await expect(page).toHaveURL(/\/instances$/)
})
