import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/app-layout'
import { PlaceholderPage } from './pages/placeholder/placeholder-page'
import { RepositoriesPage } from './pages/repositories/repositories-page'
import { TaskDetailPage } from './pages/tasks/task-detail-page'
import { TasksPage } from './pages/tasks/tasks-page'
import { ROUTES } from '@/lib/routes'
import { CurrentUserProvider } from '@/contexts/current-user-context'
import { ConfirmProvider } from '@/components/branded/confirm'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider, THEME_STORAGE_KEY } from '@/contexts/theme-provider'

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey={THEME_STORAGE_KEY}>
      <CurrentUserProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to={ROUTES.tasks} replace />} />
                <Route path={ROUTES.tasks} element={<TasksPage />} />
                <Route path={ROUTES.newTask} element={<TasksPage newTaskOpen />} />
                <Route path={ROUTES.task} element={<TaskDetailPage />} />
                <Route path={ROUTES.applications} element={<PlaceholderPage />} />
                <Route path={ROUTES.instances} element={<PlaceholderPage />} />
                <Route path={ROUTES.repositories} element={<RepositoriesPage />} />
                <Route path={ROUTES.settings} element={<PlaceholderPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </CurrentUserProvider>
      <Toaster />
    </ThemeProvider>
  )
}
