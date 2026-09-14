import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { withCurrentUser, withSheetHeader } from '../../../.storybook/decorators'
import { PREVIEW_CATALOG_SEED } from '../../../.storybook/fixtures'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { catalogHandlers } from '@/preview/handlers/catalog'
import { ROUTES } from '@/lib/routes'
import { NewApplicationPage } from './new-application-page'

const meta = {
  title: 'Pages/NewApplication',
  component: NewApplicationPage,
  tags: ['ai-generated'],
  decorators: [withSheetHeader, withCurrentUser],
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: [ROUTES.newApplication] },
    msw: [...catalogHandlers(PREVIEW_CATALOG_SEED, { delayMs: 300 }), ...baselineHandlers],
  },
} satisfies Meta<typeof NewApplicationPage>

export default meta
type Story = StoryObj<typeof meta>

async function chooseRepository(canvasElement: HTMLElement, fullName: string) {
  const canvas = within(canvasElement)
  await userEvent.click(await canvas.findByRole('combobox', { name: /Repository/ }))
  await userEvent.click(await within(canvasElement.ownerDocument.body).findByRole('option', { name: fullName }))
}

/** Step 1: one repository picker plus the Stackfile path; Next waits for a repository. */
export const ConnectStepRepository: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Next' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Let the agent generate one' })).toBeDisabled()
  },
}

/** Step 2: services detected, name and slug prefilled from the repository. */
export const ConnectStepDetectWithServices: Story = {
  play: async ({ canvas, canvasElement }) => {
    await chooseRepository(canvasElement, 'acme/design-system')
    await userEvent.click(await canvas.findByRole('button', { name: 'Next' }))

    const detected = await canvas.findByRole('list', { name: 'Detected services' }, { timeout: 5000 })

    await expect(detected).toHaveTextContent('acme/design-system/apps/api')
    await expect(canvas.getByRole('textbox', { name: /Slug/ })).toHaveValue('design-system')
  },
}

/** Step 2: no Stackfile at the path; the banner names the error and the path. */
export const ConnectStepDetectWithError: Story = {
  play: async ({ canvas, canvasElement }) => {
    await chooseRepository(canvasElement, 'acme/shop')
    await userEvent.type(await canvas.findByRole('textbox', { name: /Stackfile path/ }), 'missing/stackfile.yml')
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }))

    const banner = await canvas.findByRole('alert', {}, { timeout: 5000 })

    await expect(banner).toHaveTextContent('Stackfile not found at missing/stackfile.yml')
  },
}
