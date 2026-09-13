import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { composeStories } from '@storybook/react-vite'
import { applyTheme, THEMES } from '../../.storybook/theme'
import { findUnreadableText } from './unreadable-text'

type StoryModule = Parameters<typeof composeStories>[0]

const modules = import.meta.glob<StoryModule>('../**/*.stories.tsx', { eager: true })
const stories = Object.entries(modules).flatMap(([file, module]) =>
  Object.entries(composeStories(module)).map(([name, Story]) => ({ id: `${file} ${name}`, Story })),
)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('the theme mechanism', () => {
  it('puts only the dark class on the root when the theme is dark', () => {
    applyTheme('light')
    applyTheme('dark')
    expect([...document.documentElement.classList]).toEqual(['dark'])
  })

  it('flags text whose colour is the ground it sits on', () => {
    render(<div className="bg-background text-background">unreadable</div>)
    expect(findUnreadableText()).toHaveLength(1)
  })
})

const lightGrounds = new Map<string, string>()

describe.each(THEMES)('every story in the %s theme', (theme) => {
  beforeEach(() => applyTheme(theme))

  it.each(stories)('$id renders in its theme with no console error and no text painted in its own ground', async ({ id, Story }) => {
    const consoleError = vi.spyOn(console, 'error')
    await Story.load()
    render(<Story />)
    expect(consoleError).not.toHaveBeenCalled()
    expect(document.documentElement.classList.contains(theme)).toBe(true)
    expect(findUnreadableText().map((element) => element.outerHTML.slice(0, 120))).toEqual([])
    const ground = getComputedStyle(document.body).backgroundColor
    if (theme === 'light') lightGrounds.set(id, ground)
    else expect(ground).not.toBe(lightGrounds.get(id))
  })
})
