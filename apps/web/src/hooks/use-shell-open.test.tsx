// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SHELL_EXPANDED_QUERY, useShellOpen } from './use-shell-open'

const realMatchMedia = window.matchMedia

function aWindowThatIsWide(wide: boolean): MediaQueryList {
  const media = Object.assign(new EventTarget(), { matches: wide, media: SHELL_EXPANDED_QUERY, onchange: null })
  window.matchMedia = () => media as unknown as MediaQueryList
  return media as unknown as MediaQueryList
}

function resize(media: MediaQueryList, wide: boolean) {
  act(() => {
    media.dispatchEvent(Object.assign(new Event('change'), { matches: wide }))
  })
}

describe('useShellOpen', () => {
  afterEach(() => {
    window.matchMedia = realMatchMedia
  })

  it('collapses the rail when the window narrows below 1280 pixels', () => {
    const media = aWindowThatIsWide(true)
    const { result } = renderHook(() => useShellOpen())

    resize(media, false)

    expect(result.current[0]).toBe(false)
  })

  it('expands the rail again when the window widens past 1280 pixels', () => {
    const media = aWindowThatIsWide(false)
    const { result } = renderHook(() => useShellOpen())

    resize(media, true)

    expect(result.current[0]).toBe(true)
  })

  it('keeps a rail collapsed by hand on a wide window', () => {
    aWindowThatIsWide(true)
    const { result } = renderHook(() => useShellOpen())

    act(() => result.current[1](false))

    expect(result.current[0]).toBe(false)
  })
})
