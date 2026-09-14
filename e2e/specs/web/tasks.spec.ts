import { expect, test } from '@playwright/test'
import { EMPTY_PREVIEW, rows } from './selectors'

test('the list shows the eight tasks of the organization', async ({ page }) => {
  await page.goto('/tasks')

  await expect(page.locator(rows)).toHaveCount(8)
})

test('the tasks that need you sort to the top', async ({ page }) => {
  await page.goto('/tasks')
  await expect(page.locator(rows)).toHaveCount(8)

  const statuses = await page.locator(rows).evaluateAll((elements) => elements.map((element) => element.getAttribute('data-status')))

  expect(statuses.slice(0, 3)).toEqual(['needs_you', 'needs_you', 'running'])
})

test('the status control narrows the list to the tasks that need you', async ({ page }) => {
  await page.goto('/tasks')

  await page.getByRole('radio', { name: 'Needs you' }).click()

  await expect(page.locator(rows)).toHaveCount(2)
})

test('the search narrows the list as you type', async ({ page }) => {
  await page.goto('/tasks')

  await page.getByRole('searchbox', { name: 'Search tasks' }).fill('safari')

  await expect(page.locator(rows)).toHaveCount(1)
})

test('the status and application filters combine', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('radio', { name: 'Running' }).click()

  await page.getByRole('combobox', { name: 'Application' }).click()
  await page.getByRole('option', { name: 'billing' }).click()

  await expect(page.locator(rows)).toHaveCount(1)
})

test('a filter that matches nothing shows the filter empty state', async ({ page }) => {
  await page.goto('/tasks')

  await page.getByRole('searchbox', { name: 'Search tasks' }).fill('no such task')

  await expect(page.getByText('No tasks match')).toBeVisible()
})

test('a row opens its task', async ({ page }) => {
  await page.goto('/tasks')

  await page.getByRole('link', { name: 'Search returns nothing for accented names' }).click()

  await expect(page).toHaveURL(/\/tasks\/task-3$/)
})

test('New task opens the new task page', async ({ page }) => {
  await page.goto('/tasks')

  await page.locator('#topnav-actions').getByRole('link', { name: 'New task' }).click()

  await expect(page).toHaveURL(/\/tasks\/new$/)
})

test('cancelling a running task asks first and then shows it as cancelled', async ({ page }) => {
  await page.goto('/tasks')
  const row = page.getByRole('link', { name: 'Search returns nothing for accented names' })
  await row.hover()

  await row.getByRole('button', { name: 'Cancel Search returns nothing for accented names' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel task' }).click()

  await expect(row).toContainText('Cancelled')
})

test('an organization with no tasks and no applications offers to connect an application first', async ({ page }) => {
  await page.goto(`${EMPTY_PREVIEW}/tasks`)

  await expect(page.locator('[data-slot="page-content"]').getByRole('link', { name: 'Connect an application first' })).toBeVisible()
})
