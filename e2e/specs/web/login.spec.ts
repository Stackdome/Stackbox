import { type Page, expect, test } from '@playwright/test'

const ADMIN = { email: 'ada@example.com', password: 'password' }

async function signOut(page: Page) {
  await page.goto('/tasks')
  await page.getByRole('button', { name: /account menu/ }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)
}

test('sign out returns to Sign in', async ({ page }) => {
  await signOut(page)

  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
})

test('a wrong password shows the inline error under the form', async ({ page }) => {
  await signOut(page)

  await page.getByLabel(/^Email/).fill(ADMIN.email)
  await page.getByLabel(/^Password/).fill('not the password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('alert')).toHaveText('The email or password is not right')
  await expect(page).toHaveURL(/\/login$/)
})

test('signing in lands on Tasks', async ({ page }) => {
  await signOut(page)

  await page.getByLabel(/^Email/).fill(ADMIN.email)
  await page.getByLabel(/^Password/).fill(ADMIN.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/tasks$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Tasks' })).toBeVisible()
})

test('a signed out visitor to Tasks is sent to Sign in', async ({ page }) => {
  await signOut(page)

  await page.goto('/tasks')

  await expect(page).toHaveURL(/\/login$/)
})
