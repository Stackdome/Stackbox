// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './app'

describe('the app shell', () => {
  it('opens on Tasks and navigates to Instances from the sidebar', async () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Tasks' })).toBeTruthy()
    await userEvent.click(screen.getByRole('link', { name: 'Instances' }))
    expect(await screen.findByRole('heading', { name: 'Instances' })).toBeTruthy()
  }, 15_000)
})
