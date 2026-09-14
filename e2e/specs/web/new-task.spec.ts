import { expect, test } from '@playwright/test'
import { EMPTY_PREVIEW, rows } from './selectors'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64',
)

test('Start task with no description shows the field error and keeps the drawer open', async ({ page }) => {
  await page.goto('/tasks/new')

  await page.getByRole('button', { name: 'Start task' }).click()

  await expect(page.getByText('Describe what went wrong')).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'New task' })).toBeVisible()
})

test('a chosen screenshot shows a thumbnail and Remove clears it', async ({ page }) => {
  await page.goto('/tasks/new')

  await page.getByLabel('Screenshot').setInputFiles({ name: 'cart.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByRole('img', { name: 'Screenshot preview' })).toBeVisible()
  await page.getByRole('button', { name: 'Remove' }).click()

  await expect(page.getByRole('img', { name: 'Screenshot preview' })).toHaveCount(0)
})

test('the Advanced disclosure shows and hides the target branch and run limit', async ({ page }) => {
  await page.goto('/tasks/new')
  const advanced = page.getByRole('button', { name: 'Advanced' })

  await advanced.click()
  await expect(page.getByLabel('Run limit')).toHaveValue('2')
  await advanced.click()

  await expect(page.getByLabel('Run limit')).toBeHidden()
})

test('Start task closes the drawer and puts a running Intake row on top of the list', async ({ page }) => {
  await page.goto('/tasks/new')
  await page.getByRole('combobox', { name: 'Application' }).click()
  await page.getByRole('option', { name: 'shop' }).click()
  await page.getByLabel('Description').fill('The cart badge shows zero after a refresh.')

  await page.getByRole('button', { name: 'Start task' }).click()

  await expect(page).toHaveURL(/\/tasks$/)
  await expect(page.getByRole('dialog', { name: 'New task' })).toHaveCount(0)
  await expect(page.locator(rows).first()).toContainText('The cart badge shows zero after a refresh.')
  await expect(page.locator(rows).first()).toContainText('Starting')
})

test('Escape closes the drawer back to the list', async ({ page }) => {
  await page.goto('/tasks/new')
  await expect(page.getByRole('dialog', { name: 'New task' })).toBeVisible()

  await page.keyboard.press('Escape')

  await expect(page).toHaveURL(/\/tasks$/)
})

test('an organization with no applications is told to connect one first', async ({ page }) => {
  await page.goto(`${EMPTY_PREVIEW}/tasks/new`)
  const drawer = page.getByRole('dialog', { name: 'New task' })

  await expect(drawer.getByRole('link', { name: 'Connect an application first' })).toBeVisible()
  await expect(drawer.locator('[data-slot="drawer-footer"]').getByRole('button', { name: 'Close', exact: true })).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Start task' })).toHaveCount(0)
})
