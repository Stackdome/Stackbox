import type { Decorator } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'

/** Provider-only wrapper for stories whose component reads router context. */
export const withRouter: Decorator = (Story) => (
  <MemoryRouter>
    <Story />
  </MemoryRouter>
)
