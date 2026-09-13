import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/app-layout'
import { PlaceholderPage } from './pages/placeholder/placeholder-page'
import { ROUTES } from '@/lib/routes'
import { CurrentUserProvider } from '@/contexts/current-user-context'
import { ConfirmProvider } from '@/components/branded/confirm'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider, THEME_STORAGE_KEY } from '@/contexts/theme-provider'

const SHELL_EXPANDED_QUERY = '(min-width: 1280px)'

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey={THEME_STORAGE_KEY}>
      <CurrentUserProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout defaultSidebarOpen={window.matchMedia(SHELL_EXPANDED_QUERY).matches} />}>
                <Route index element={<Navigate to={ROUTES.tasks} replace />} />
                <Route path={ROUTES.tasks} element={<PlaceholderPage title="Tasks" />} />
                <Route path={ROUTES.applications} element={<PlaceholderPage title="Applications" />} />
                <Route path={ROUTES.instances} element={<PlaceholderPage title="Instances" />} />
                <Route path={ROUTES.repositories} element={<PlaceholderPage title="Repositories" />} />
                <Route path={ROUTES.settings} element={<PlaceholderPage title="Settings" />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </CurrentUserProvider>
      <Toaster />
    </ThemeProvider>
  )
}
