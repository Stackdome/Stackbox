import type { components } from '@stackbox/contract'
import { http, HttpResponse, type HttpHandler } from 'msw'
import type { PreviewCatalog } from './catalog'

type Schemas = components['schemas']

const ORG = '*/api/v1/organizations/:orgId'

const UNKNOWN_REPOSITORY = { code: 'unknown_repository', message: 'Repository not found in this organization or provider' }

export function repositoryHandlers(catalog: PreviewCatalog): HttpHandler[] {
  return [
    http.get(`${ORG}/git-connections`, () => HttpResponse.json({ items: catalog.connections() })),

    http.post(`${ORG}/git-connections`, async ({ request }) => {
      const created = catalog.connect((await request.json()) as Schemas['GitConnectionCreate'])
      return created
        ? HttpResponse.json(created, { status: 201 })
        : HttpResponse.json({ code: 'connection_exists', message: 'This provider account is already connected' }, { status: 409 })
    }),

    http.post(`${ORG}/git-connections/:connectionId/verify`, ({ params }) => {
      const verified = catalog.verify(String(params.connectionId))
      return verified ? HttpResponse.json(verified) : HttpResponse.json({ message: 'git connection not found' }, { status: 404 })
    }),

    http.get(`${ORG}/git-connections/:connectionId/available-repositories`, ({ params }) => {
      const available = catalog.available(String(params.connectionId))
      return available ? HttpResponse.json({ items: available }) : HttpResponse.json({ message: 'git connection not found' }, { status: 404 })
    }),

    http.get(`${ORG}/repositories`, () => HttpResponse.json({ items: catalog.repositories() })),

    http.post(`${ORG}/repositories`, async ({ request }) => {
      const added = catalog.add((await request.json()) as Schemas['RepositoryAdd'])
      return added ? HttpResponse.json({ items: added }, { status: 201 }) : HttpResponse.json(UNKNOWN_REPOSITORY, { status: 404 })
    }),

    http.delete(`${ORG}/repositories/:repositoryId`, ({ params }) => {
      const repositoryId = String(params.repositoryId)
      if (!catalog.hasRepository(repositoryId)) {
        return HttpResponse.json({ message: 'repository not found' }, { status: 404 })
      }
      const applications = catalog.usedBy(repositoryId)
      if (applications.length > 0) {
        return HttpResponse.json(
          { code: 'repository_in_use', message: 'Disconnect the applications this repository backs before removing it', applications },
          { status: 409 },
        )
      }
      catalog.removeRepository(repositoryId)
      return new HttpResponse(null, { status: 204 })
    }),
  ]
}
