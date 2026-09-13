import type { Preview } from '@storybook/react-vite'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { addons } from 'storybook/preview-api'
import { mswLoader } from 'msw-storybook-addon/csf3'
import '../src/index.css'
import { makeUser } from './fixtures'
import { baselineHandlers } from './msw-handlers'
import { applyTheme, THEMES, type Theme } from './theme'
import { ThemeProvider, THEME_STORAGE_KEY } from '../src/contexts/theme-provider'

// Seed before anything renders: the axios interceptor and org-id helpers read
// these keys synchronously, and a missing authToken sends stories into the
// refresh → /sign-in redirect path.
localStorage.setItem('authToken', 'sb-token')
localStorage.setItem('refreshToken', 'sb-refresh')
localStorage.setItem('currentUser', JSON.stringify(makeUser()))

// Driven off the globals channel rather than a decorator: decorators wrap
// stories only, so the Foundations MDX pages, which document the tokens the
// toggle exists to show, would never receive the class.
function applyThemeGlobal({ globals }: { globals?: { theme?: string } }) {
  const theme = globals?.theme
  if (theme) applyTheme(theme as Theme)
}

const channel = addons.getChannel()
channel.on('setGlobals', applyThemeGlobal)
channel.on('globalsUpdated', applyThemeGlobal)

interface RouterParameters {
  initialEntries?: string[]
  path?: string
}

const preview: Preview = {
  loaders: [mswLoader()],
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [...THEMES],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    // Every story renders inside exactly one router: nesting a second one
    // throws, so a story never renders its own `MemoryRouter`. `parameters.router`
    // sets the entries a story starts on and, when it names a `path`, wraps the
    // story in a `Route` so hooks that read route params resolve.
    (Story, context) => {
      const { initialEntries, path } = (context.parameters.router ?? {}) as RouterParameters
      return (
        <MemoryRouter initialEntries={initialEntries}>
          {path ? (
            <Routes>
              <Route path={path} element={<Story />} />
            </Routes>
          ) : (
            <Story />
          )}
        </MemoryRouter>
      )
    },
    // Every story renders inside the same theme mechanism the app uses, so a
    // story never wraps its own `ThemeProvider`. `defaultTheme` reads the root
    // class rather than hardcoding `light`, so the themes sweep, which sets the
    // class before render, keeps proving dark instead of the provider's own
    // state resetting it back to light on mount.
    (Story) => (
      <ThemeProvider
        storageKey={THEME_STORAGE_KEY}
        defaultTheme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
      >
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    msw: baselineHandlers,
    options: {
      storySort: {
        order: ['Foundations', 'Primitives', 'Branded', 'Features', 'Pages'],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
