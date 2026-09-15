// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SheetHost } from './sheet-host'
import { ROUTES } from '@/lib/routes'

describe('SheetHost', () => {
  // Two tests in this file both render a heading; without this, the DOM from
  // one test's render is still there when the next test queries the page.
  afterEach(cleanup)


  it('builds the sheet header trail from the current route alone', () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.instances]}>
        <SheetHost>{null}</SheetHost>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Instances', current: 'page' })).toBeInTheDocument()
  })

  it('draws the current route as the one page heading', () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.instances]}>
        <SheetHost>
          <p>page body</p>
        </SheetHost>
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('heading', { level: 1 }).map((heading) => heading.textContent)).toEqual(['Instances'])
  })
})
