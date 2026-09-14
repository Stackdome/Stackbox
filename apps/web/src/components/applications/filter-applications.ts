import type { ApplicationListView } from '@/api/mappers/application'

export function filterApplications(applications: ApplicationListView[], q: string): ApplicationListView[] {
  const needle = q.trim().toLowerCase()
  return applications.filter((application) =>
    [application.name, application.slug, application.repositoryFullName, ...application.serviceNames].some((text) => text.toLowerCase().includes(needle)),
  )
}
