import type { components } from '@stackbox/contract'
import { http, HttpResponse, type HttpHandler } from 'msw'
import type { PreviewCatalog, Refusal } from './catalog'

type Schemas = components['schemas']

const ORG = '*/api/v1/organizations/:orgId'

const notFound = () => HttpResponse.json({ message: 'instance not found' }, { status: 404 })

function answer(result: object | null, okStatus = 200) {
  if (result === null) return notFound()
  if ('body' in result) {
    const refused = result as Refusal
    return HttpResponse.json(refused.body, { status: refused.status })
  }
  return HttpResponse.json(result, { status: okStatus })
}

export function instanceHandlers(catalog: PreviewCatalog, owner: Schemas['InstanceOwner']): HttpHandler[] {
  return [
    http.get(`${ORG}/instances`, ({ request }) => {
      const params = new URL(request.url).searchParams
      const items = catalog.instances({ applicationId: params.get('application_id'), includeTornDown: params.get('include_torn_down') === 'true' })
      return HttpResponse.json({ items, total: items.length })
    }),

    http.post(`${ORG}/instances`, async ({ request }) => answer(catalog.spinUp((await request.json()) as Schemas['InstanceSpinUp'], owner), 201)),

    http.get(`${ORG}/instances/:instanceId`, ({ params }) => answer(catalog.instance(String(params.instanceId)))),

    http.get(`${ORG}/instances/:instanceId/releases`, ({ params }) => {
      const releases = catalog.releasesOf(String(params.instanceId))
      return releases ? HttpResponse.json({ items: releases }) : notFound()
    }),

    http.post(`${ORG}/instances/:instanceId/releases`, async ({ params, request }) =>
      answer(catalog.deploy(String(params.instanceId), (await request.json()) as Schemas['ReleaseCreate']), 201),
    ),

    http.post(`${ORG}/instances/:instanceId/teardown`, ({ params }) => answer(catalog.teardown(String(params.instanceId)))),

    http.post(`${ORG}/instances/:instanceId/expiry`, async ({ params, request }) =>
      answer(catalog.extendExpiry(String(params.instanceId), ((await request.json()) as Schemas['InstanceExpiryExtend']).hours)),
    ),
  ]
}
