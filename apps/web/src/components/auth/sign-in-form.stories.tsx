import type { Meta, StoryObj } from '@storybook/react-vite'
import { AxiosError } from 'axios'
import { expect, userEvent } from 'storybook/test'
import type { SignInDraft } from '@/api/mappers/current-user'
import { AuthFrame } from './auth-frame'
import { SignInForm } from './sign-in-form'

function refusedWith(status: number, data: unknown): AxiosError {
  const error = new AxiosError('request failed')
  error.response = { status, statusText: '', headers: {}, config: {} as never, data }
  return error
}

const ORGANIZATIONS = [
  { id: 'org-1', name: 'acme' },
  { id: 'org-2', name: 'globex' },
]

const meta = {
  title: 'Features/Auth/SignInForm',
  component: SignInForm,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <AuthFrame title="Sign in">
        <Story />
      </AuthFrame>
    ),
  ],
  args: { onSubmit: async (_draft: SignInDraft) => {} },
} satisfies Meta<typeof SignInForm>

export default meta
type Story = StoryObj<typeof meta>

/** Master plan red test 3: the login form's single owning control is 40px tall and every other field is 32px. */
export const SingleOwningControl: Story = {
  play: async ({ canvas, canvasElement }) => {
    const heightOf = (element: Element) => element.getBoundingClientRect().height
    const controls = [...canvasElement.querySelectorAll('input, button')]

    await expect([
      heightOf(canvas.getByRole('button', { name: 'Sign in' })),
      heightOf(canvas.getByLabelText(/^Email/)),
      heightOf(canvas.getByLabelText(/^Password/)),
      controls.filter((control) => heightOf(control) === 40).length,
    ]).toEqual([40, 32, 32, 1])
  },
}

/** Sign in with nothing typed says what is missing, under the form. */
export const BlankSaysWhatIsMissing: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))

    await expect(canvas.getByRole('alert')).toHaveTextContent('Enter your email and password')
  },
}

/** A refused password is an inline line under the form, never a toast. */
export const WrongPasswordSaysSoUnderTheForm: Story = {
  args: {
    onSubmit: async () => {
      throw refusedWith(401, { code: 'invalid_credentials', message: 'The email or password is not right' })
    },
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText(/^Email/), 'ada@example.com')
    await userEvent.type(canvas.getByLabelText(/^Password/), 'not the password')
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))

    await expect(canvas.getByRole('alert')).toHaveTextContent('The email or password is not right')
  },
}

/** R4: one email in two organizations asks which, and keeps the password typed. */
export const ChoosesAnOrganization: Story = {
  args: {
    onSubmit: async (draft) => {
      if (draft.organizationId === null) {
        throw refusedWith(409, { code: 'choose_organization', message: 'Choose the organization to sign in to', details: { organizations: ORGANIZATIONS } })
      }
    },
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText(/^Email/), 'ada@example.com')
    await userEvent.type(canvas.getByLabelText(/^Password/), 'password')
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))

    await expect(await canvas.findByRole('radio', { name: 'globex' })).toBeVisible()
    await expect(canvas.getByLabelText(/^Password/)).toHaveValue('password')
  },
}
