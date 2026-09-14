import { expect, test } from '@playwright/test'
import { badge } from './selectors'

test('replying in the Needs you banner resumes the task and drops the Tasks badge by one', async ({ page }) => {
  await page.goto('/tasks/task-1')
  await expect(page.locator(badge)).toHaveText('2')
  const reply = page.getByRole('textbox', { name: 'Reply to the agent' })
  const send = page.getByRole('button', { name: 'Send' })
  await expect(send).toBeDisabled()

  await reply.fill('Safari 17.4 on macOS 14.')
  await expect(send).toBeEnabled()
  await send.click()

  await expect(reply).toHaveCount(0)
  await expect(page.locator('[data-status="active"]', { hasText: 'Implementing' })).toBeVisible()
  await expect(page.locator(badge)).toHaveText('1')
  await page.getByRole('tab', { name: 'Conversation' }).click()
  await expect(page.getByRole('list', { name: 'Conversation' })).toContainText('Safari 17.4 on macOS 14.')
})

test('the tabs switch between Timeline, Checks, Runs and Conversation', async ({ page }) => {
  await page.goto('/tasks/task-2')

  const shown: string[] = []
  for (const [tab, text] of [
    ['Timeline', 'Moved to Preparing'],
    ['Checks', 'Fix verified: failed'],
    ['Runs', 'Run 2'],
    ['Conversation', "Should the symbol follow the customer's locale or the store's?"],
  ]) {
    await page.getByRole('tab', { name: tab }).click()
    await expect(page.getByRole('tabpanel')).toContainText(text)
    shown.push(tab)
  }

  expect(shown).toEqual(['Timeline', 'Checks', 'Runs', 'Conversation'])
})

test('a check screenshot opens the artifact viewer at the 760 work width', async ({ page }) => {
  await page.goto('/tasks/task-5')
  await page.getByRole('tab', { name: 'Checks' }).click()

  await page.getByRole('tabpanel').getByRole('button', { name: 'Open screenshot' }).first().click()

  // boundingBox is a single snapshot; the 200ms zoom-in animation requires polling until it settles.
  const viewer = page.getByTestId('artifact-viewer')
  await expect.poll(async () => Math.round((await viewer.boundingBox())?.width ?? 0)).toBe(760)
})

test('a test log opens in the split console', async ({ page }) => {
  await page.goto('/tasks/task-7')
  await page.getByRole('tab', { name: 'Checks' }).click()

  await page.getByRole('tabpanel').getByRole('button', { name: 'Open test log' }).first().click()

  await expect(page.getByTestId('artifact-viewer')).toContainText('FAIL checkout.spec.ts')
})

test('a pull request opens on the provider in a new tab', async ({ page }) => {
  await page.goto('/tasks/task-5')

  await expect(page.getByRole('link', { name: 'acme/shop #142' })).toHaveAttribute('target', '_blank')
})

test('a cancelled task says it was cancelled and that nothing is ready to merge', async ({ page }) => {
  await page.goto('/tasks/task-8')

  await expect(page.getByRole('complementary')).toContainText('The task was cancelled before a fix was proven')
  await expect(page.getByRole('textbox', { name: 'Reply to the agent' })).toHaveCount(0)
})
