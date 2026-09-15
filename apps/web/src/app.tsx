import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/app-layout'
import { SessionGate } from '@/components/session-gate'
import { ApplicationDetailPage } from './pages/applications/application-detail-page'
import { ApplicationsPage } from './pages/applications/applications-page'
import { NewApplicationPage } from './pages/applications/new-application-page'
import { InstanceDetailPage } from './pages/instances/instance-detail-page'
import { InstancesPage } from './pages/instances/instances-page'
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
              <Route
                element={
                  <SessionGate>
                    <AppLayout />
                  </SessionGate>
                }
              >
                <Route index element={<Navigate to={ROUTES.tasks} replace />} />
                <Route path={ROUTES.tasks} element={<TasksPage />} />
                <Route path={ROUTES.newTask} element={<TasksPage newTaskOpen />} />
                <Route path={ROUTES.task} element={<TaskDetailPage />} />
                <Route path={ROUTES.applications} element={<ApplicationsPage />} />
                <Route path={ROUTES.newApplication} element={<NewApplicationPage />} />
                <Route path={ROUTES.application} element={<ApplicationDetailPage />} />
                <Route path={ROUTES.instances} element={<InstancesPage />} />
                <Route path={ROUTES.instance} element={<InstanceDetailPage />} />
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
