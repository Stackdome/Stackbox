import { previewHandlers } from './handlers'

/**
 * Boots the browser preview (`pnpm dev:mock`): the **real** app, real router,
 * real shell, real pages, against a mocked network.
 *
 * No backend process is required, only the mocked network below. Storybook
 * judges components; this judges the product, in a browser, with navigation
 * that actually works.
 */
export async function startPreview(): Promise<void> {
  const { setupWorker } = await import('msw/browser')
  const worker = setupWorker(...previewHandlers)

  // `onUnhandledRequest: 'bypass'` keeps Vite's own asset and HMR traffic out
  // of the console: only /api/v1 is mocked, and that has a catch-all.
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  })


  console.info(
    `%c preview `,
    'background:#191714;color:#F5F4F1;border-radius:4px',
    'mocked network, no backend required. Sign in as ada@example.com with the password "password".',
  )
}
