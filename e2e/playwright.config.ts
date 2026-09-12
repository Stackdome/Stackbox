import { defineConfig } from '@playwright/test'

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
      testMatch: 'api/**',
      use: { baseURL: 'http://localhost:3000' },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @stackbox/web dev:mock',
      url: 'http://localhost:5273',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter @stackbox/api migrate && pnpm --filter @stackbox/api start',
      url: 'http://localhost:3000/api/v1/health',
      reuseExistingServer: !process.env.CI,
      env: { DATABASE_URL: process.env.DATABASE_URL as string },
    },
  ],
})
