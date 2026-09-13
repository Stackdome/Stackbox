import path from 'path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Three projects: the jsdom unit suite, every story run as a test in a real
// browser, and each story swept again under every theme. The story project
// renders each story and executes its play function, so a component change
// that breaks a story fails the build instead of rotting until someone opens
// Storybook.
export default defineConfig({
  test: {
    // Vitest's exit-code check reads passWithNoTests off the root config, not
    // a project's own, so the flag has to live here too even though only the
    // unit project needs it right now.
    passWithNoTests: true,
    projects: [
      {
        extends: './vite.config.ts',
        test: {
          name: 'unit',
          // Environment stays per-file via each spec's own @vitest-environment
          // pragma, not a project-wide default.
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['src/**/*.browser.test.tsx'],
          // jsdom has no layout engine, so the geometry APIs it omits are
          // stubbed here rather than guarded at every call site. See the file.
          setupFiles: ['./src/test-support/jsdom-globals.ts'],
          sequence: { groupOrder: 0 },
          // Without this, vitest fails a project that matches zero files.
          passWithNoTests: true,
        },
      },
      {
        extends: './vite.config.ts',
        plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
        optimizeDeps: { entries: ['src/**/*.stories.tsx', '.storybook/preview.tsx'] },
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            viewport: { width: 1440, height: 900 },
          },
          // Runs after the unit project rather than alongside it: a browser
          // project and a large jsdom suite oversubscribe the cores and
          // starve each other into timeouts.
          sequence: { groupOrder: 1 },
          // A story renders in well under a second; this ceiling is only ever
          // reached when a loaded machine starves the browser. Genuine
          // breakage fails on the assertion instead, so the headroom hides
          // nothing.
          testTimeout: 30000,
        },
      },
      {
        extends: './vite.config.ts',
        optimizeDeps: { entries: ['src/**/*.stories.tsx', '.storybook/preview.tsx'] },
        test: {
          name: 'themes',
          include: ['src/**/*.browser.test.tsx'],
          setupFiles: ['./src/test-support/storybook-annotations.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            viewport: { width: 1440, height: 900 },
          },
          // After the story project: two browser projects running at once
          // starve each other.
          sequence: { groupOrder: 2 },
          testTimeout: 30000,
        },
      },
    ],
  },
})
