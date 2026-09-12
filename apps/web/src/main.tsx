import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app'

/**
 * `VITE_PREVIEW` swaps the network for mocks so the real app can be reviewed
 * in a browser with no backend (`pnpm dev:mock`). Awaited before anything
 * renders: a request that escapes before the worker is listening would hit
 * a server that isn't there.
 */
async function bootstrap() {
  if (import.meta.env.VITE_PREVIEW) {
    const { startPreview } = await import('./preview/start')
    await startPreview()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
