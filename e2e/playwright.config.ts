import { defineConfig } from '@playwright/test'

// Matches apps/api/.env.example's commented stackbox_test line and
// compose.yaml's postgres port; the api webServer needs a real DATABASE_URL
// even when the shell running `pnpm e2e` didn't set one.
const TEST_DATABASE_URL = 'postgres://postgres:postgres@localhost:5433/stackbox_test'

// Only ever signs tokens for the throwaway e2e server.
const TEST_JWT_SECRET = 'e2e-only-signing-secret-of-at-least-32-chars'

export default defineConfig({
  testDir: './specs',
  reporter: 'list',
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'web',
      testMatch: 'web/**',
      use: { baseURL: 'http://localhost:5273' },
    },
    {
      name: 'api',
      testMatch: 'api/**/*.spec.ts',
      testIgnore: 'api/tasks.spec.ts',
      use: { baseURL: 'http://localhost:3000' },
    },
    {
      // auth.spec.ts cancels the newest running tasks, which would include the task tasks.spec.ts creates.
      name: 'api-tasks',
      testMatch: 'api/tasks.spec.ts',
      dependencies: ['api'],
      use: { baseURL: 'http://localhost:3000' },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @stackbox/web dev:mock',
      url: 'http://localhost:5273',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @stackbox/web dev:mock:empty',
      url: 'http://localhost:5274',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command:
        'pnpm --filter @stackbox/api migrate && pnpm --filter @stackbox/api seed && pnpm --filter @stackbox/api start',
      url: 'http://localhost:3000/api/v1/health',
      // Every local run migrates and seeds fresh: a reused server would skip the
      // reseed and leave the second run's running-task fixtures already consumed.
      reuseExistingServer: false,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? TEST_DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET ?? TEST_JWT_SECRET,
        RECONCILER_ENABLED: 'true',
        AGENT_RUNTIME: 'scripted',
      },
      timeout: 120_000,
    },
  ],
})
