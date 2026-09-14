import type { components } from '@stackbox/contract'
import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import { slugFrom } from '@/api/mappers/application'
import type { PreviewCatalog } from './catalog'

type Schemas = components['schemas']

const ORG = '*/api/v1/organizations/:orgId'

const UNKNOWN_REPOSITORY = { code: 'unknown_repository', message: 'Repository not found in this organization or provider' }

const notFound = () => HttpResponse.json({ message: 'application not found' }, { status: 404 })

export function applicationHandlers(catalog: PreviewCatalog, delayMs: number): HttpHandler[] {
  return [
    http.get(`${ORG}/applications`, () => {
      const items = catalog.applications()
      return HttpResponse.json({ items, total: items.length })
    }),

    http.post(`${ORG}/applications/detect`, async ({ request }) => {
      const input = (await request.json()) as Schemas['StackfileDetect']
      await delay(delayMs)
      const detection = catalog.detect(input)
      return detection ? HttpResponse.json(detection) : HttpResponse.json(UNKNOWN_REPOSITORY, { status: 404 })
    }),

    http.post(`${ORG}/applications`, async ({ request }) => {
      const input = (await request.json()) as Schemas['ApplicationCreate']
      const slug = input.slug ?? slugFrom(input.name)
      if (catalog.slugTaken(slug)) {
        return HttpResponse.json({ code: 'slug_taken', message: 'Another application already uses this slug' }, { status: 409 })
      }
      const created = catalog.create(input, slug)
      return created ? HttpResponse.json(created, { status: 201 }) : HttpResponse.json(UNKNOWN_REPOSITORY, { status: 404 })
    }),

    http.get(`${ORG}/applications/:applicationId`, ({ params }) => {
      const detail = catalog.application(String(params.applicationId))
      return detail ? HttpResponse.json(detail) : notFound()
    }),

    http.get(`${ORG}/applications/:applicationId/services`, ({ params }) => {
      const detail = catalog.application(String(params.applicationId))
      return detail ? HttpResponse.json({ items: detail.services }) : notFound()
    }),

    http.patch(`${ORG}/applications/:applicationId`, async ({ params, request }) => {
      const updated = catalog.update(String(params.applicationId), (await request.json()) as Schemas['ApplicationUpdate'])
      return updated ? HttpResponse.json(updated) : notFound()
    }),

    http.post(`${ORG}/applications/:applicationId/sync`, async ({ params }) => {
      await delay(delayMs)
      const synced = catalog.sync(String(params.applicationId))
      return synced ? HttpResponse.json(synced) : notFound()
    }),

    http.delete(`${ORG}/applications/:applicationId`, ({ params }) => {
      const applicationId = String(params.applicationId)
      if (!catalog.application(applicationId)) return notFound()
      if (catalog.hasActiveTasks(applicationId)) {
        return HttpResponse.json({ code: 'application_has_active_tasks', message: "Cancel or finish the application's running tasks first" }, { status: 409 })
      }
      if (catalog.hasLiveInstances(applicationId)) {
        return HttpResponse.json({ code: 'application_has_live_instances', message: "Tear down this application's instances first" }, { status: 409 })
      }
      catalog.removeApplication(applicationId)
      return new HttpResponse(null, { status: 204 })
    }),
  ]
}
