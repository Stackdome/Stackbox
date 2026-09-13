import { expect, test } from '@playwright/test'

test('the preview opens on Tasks inside the shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Tasks' })).toBeVisible()
})

test('the sidebar holds the five destinations in order for an admin', async ({ page }) => {
  await page.goto('/tasks')

  await expect(page.locator('[data-sidebar="content"]').getByRole('link')).toHaveText([
    'Tasks',
    'Applications',
    'Instances',
    'Repositories',
    'Settings',
  ])
})

test('the Organization group is labelled for an admin', async ({ page }) => {
  await page.goto('/tasks')

  await expect(page.locator('[data-sidebar="content"]').getByText('Organization', { exact: true })).toBeVisible()
})

test('the Tasks badge reads the number of tasks that need you', async ({ page }) => {
  await page.goto('/tasks')

  await expect(page.locator('[data-sidebar="menu-badge"]')).toHaveText('2')
})

test('collapsing the rail turns the badge into a dot', async ({ page }) => {
  await page.goto('/tasks')
  await expect(page.locator('[data-sidebar="menu-badge"]')).toHaveText('2')

  await page.getByRole('button', { name: 'Toggle Sidebar' }).click()

  await expect(page.locator('[data-slot="nav-item-dot"]')).toBeVisible()
})

test('the active item tracks the route', async ({ page }) => {
  await page.goto('/tasks')

  await page.locator('[data-sidebar="content"]').getByRole('link', { name: 'Instances' }).click()

  await expect(page.locator('[data-sidebar="content"]').getByRole('link', { name: 'Instances' })).toHaveAttribute('data-active', 'true')
})

for (const path of ['/tasks', '/applications', '/instances', '/repositories', '/settings']) {
  test(`${path} draws exactly one page heading`, async ({ page }) => {
    await page.goto(path)

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  })
}
