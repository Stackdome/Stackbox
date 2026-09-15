import { expect, test } from '@playwright/test'
import { apiTokenRows, memberRows } from './selectors'

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

test('renaming the organization saves, and Save goes quiet again', async ({ page }) => {
  await page.goto('/settings')
  const name = page.getByLabel(/^Organization name/)
  await expect(name).toHaveValue('acme')

  await name.fill('acme labs')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
  await page.reload()
  await expect(page.getByLabel(/^Organization name/)).toHaveValue('acme labs')
})

test('Members lists the organization with the admin own row unremovable', async ({ page }) => {
  await page.goto('/settings/members')

  await expect(page.locator(memberRows)).toHaveCount(3)
  await expect(page.getByRole('button', { name: 'Remove Ada Lovelace' })).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings')
})

test('inviting a member shows the link, and Copy puts it on the clipboard', async ({ page }) => {
  await page.goto('/settings/members')

  await page.getByRole('button', { name: 'Invite', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Invite a member' })
  await drawer.getByLabel(/^Email/).fill('hopper@example.com')
  await drawer.getByRole('button', { name: 'Invite', exact: true }).click()
  const link = await drawer.getByLabel('Invite link').inputValue()
  await drawer.getByRole('button', { name: 'Copy' }).click()

  await expect(drawer.getByRole('button', { name: 'Copied' })).toBeVisible()
  expect([link.includes('/invites/'), await page.evaluate(() => navigator.clipboard.readText())]).toEqual([true, link])
  await drawer.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('region', { name: 'Pending invites' })).toContainText('hopper@example.com')
})

test('creating a token shows its secret once', async ({ page }) => {
  await page.goto('/settings/tokens')
  await expect(page.locator(apiTokenRows)).toHaveCount(1)

  await page.getByRole('button', { name: 'New token' }).click()
  const drawer = page.getByRole('dialog', { name: 'New API token' })
  await drawer.getByLabel(/^Name/).fill('deploy bot')
  await drawer.getByRole('button', { name: 'Create' }).click()
  const secret = await drawer.getByLabel('Token').inputValue()
  await drawer.getByRole('button', { name: 'Done' }).click()

  await expect(page.locator(apiTokenRows)).toHaveCount(2)
  await expect(page.getByText(secret)).toHaveCount(0)
  await expect(page.locator(apiTokenRows).first()).toContainText(`${secret.slice(0, 8)}…`)
})

test('revoking a token asks first, then drops the row', async ({ page }) => {
  await page.goto('/settings/tokens')
  await expect(page.locator(apiTokenRows)).toHaveCount(1)

  await page.getByRole('button', { name: 'Revoke CI deploys' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Revoke' }).click()

  await expect(page.locator(apiTokenRows)).toHaveCount(0)
  await expect(page.getByText('No API tokens yet')).toBeVisible()
})
