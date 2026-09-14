// @vitest-environment jsdom
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { uploadScreenshot } from './artifacts'

describe('uploadScreenshot', () => {
  let contentType: string | null = null
  const server = setupServer(
    http.post('*/api/v1/organizations/:orgId/artifacts', async ({ request }) => {
      contentType = request.headers.get('content-type')
      return HttpResponse.json({ id: 'artifact-1', kind: 'screenshot', url: 'data:image/png;base64,', meta: {} }, { status: 201 })
    }),
  )

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())

  it('posts the screenshot with a multipart content type, not the client default', async () => {
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'cart.png', { type: 'image/png' })

    await uploadScreenshot('org-1', file)

    expect(contentType).toMatch(/^multipart\/form-data;/)
  })
})
