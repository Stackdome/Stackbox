// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SheetHost } from './sheet-host'
import { ROUTES } from '@/lib/routes'

describe('SheetHost', () => {
  it('builds the sheet header trail from the current route alone', () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.instances]}>
        <SheetHost>{null}</SheetHost>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Instances', current: 'page' })).toBeInTheDocument()
  })
})
