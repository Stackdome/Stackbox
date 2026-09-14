import { expect, test } from '@playwright/test'
import { EMPTY_PREVIEW, rows } from './selectors'

test('removing a repository that backs applications names both in the blocked dialog', async ({ page }) => {
  await page.goto('/repositories')
  await page.getByRole('button', { name: 'Actions for acme/billing' }).click()

  await page.getByRole('menuitem', { name: 'Remove' }).click()

  await expect(page.getByRole('dialog', { name: 'Remove is blocked' }).getByRole('listitem')).toHaveText(['billing', 'ledger'])
})

test('removing an unused repository asks first, then drops its row', async ({ page }) => {
  await page.goto('/repositories')
  const github = page.getByRole('region', { name: 'GitHub acme' })
  await github.getByRole('button', { name: 'Actions for acme/design-system' }).click()
  await page.getByRole('menuitem', { name: 'Remove' }).click()

  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove repository' }).click()

  await expect(github.locator(rows)).toHaveCount(2)
  await expect(github).not.toContainText('acme/design-system')
})

test('the add drawer footer counts the picked repositories and adding inserts their rows', async ({ page }) => {
  await page.goto('/repositories')
  const github = page.getByRole('region', { name: 'GitHub acme' })
  await github.getByRole('button', { name: 'Add repositories' }).click()
  const drawer = page.getByRole('dialog', { name: 'Add repositories' })
  const add = drawer.getByRole('button', { name: /^Add \d+ repositor/ })
  await expect(add).toHaveText('Add 0 repositories')

  await drawer.getByRole('option', { name: /acme\/acme-api/ }).click()
  await drawer.getByRole('option', { name: /acme\/infra/ }).click()
  await expect(add).toHaveText('Add 2 repositories')
  await add.click()

  await expect(drawer).toHaveCount(0)
  await expect(github.locator(rows)).toHaveCount(5)
  await expect(github).toContainText('acme/acme-api')
  await expect(github).toContainText('acme/infra')
})

test('connecting a provider adds its section with no repositories', async ({ page }) => {
  await page.goto('/repositories')
  await page.getByRole('button', { name: 'Connect provider' }).click()
  const drawer = page.getByRole('dialog', { name: 'Connect provider' })

  await drawer.getByRole('textbox', { name: /Account login/ }).fill('globex')
  await drawer.getByRole('button', { name: 'Connect', exact: true }).click()

  await expect(page.getByRole('region', { name: 'GitHub globex' })).toContainText('No repositories added yet')
})

test('reconnecting a provider that needs re-auth flips it to Verified', async ({ page }) => {
  await page.goto('/repositories')
  const gitlab = page.getByRole('region', { name: 'GitLab acme-platform' })
  await expect(gitlab).toContainText('Needs re-auth')

  await gitlab.getByRole('button', { name: 'Reconnect' }).click()

  await expect(gitlab).toContainText('Verified')
  await expect(gitlab).not.toContainText('Needs re-auth')
})

test('an organization with no providers is told to connect one', async ({ page }) => {
  await page.goto(`${EMPTY_PREVIEW}/repositories`)

  await expect(page.getByText('Connect a git provider')).toBeVisible()
})
