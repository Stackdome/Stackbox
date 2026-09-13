// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SheetHost } from './sheet-host'
import { PageTitle } from '@/components/page-title'
import { ROUTES } from '@/lib/routes'

describe('SheetHost', () => {
  it('renders the page title from the breadcrumb inside the sheet header', () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.instances]}>
        <SheetHost>
          <PageTitle>Instances</PageTitle>
        </SheetHost>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Instances' })).toBeInTheDocument()
  })
})
