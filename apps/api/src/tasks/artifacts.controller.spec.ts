import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AccessGuard } from '../access'
import { JwtCookieGuard } from '../auth'
import { ArtifactsController } from './artifacts.controller'
import { MAX_ARTIFACT_BYTES } from './errors'
import { TaskService } from './task.service'

describe('ArtifactsController', () => {
  let app: INestApplication
  let baseUrl: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ArtifactsController],
      providers: [{ provide: TaskService, useValue: { uploadScreenshot: () => Promise.reject(new Error('multer should reject this upload first')) } }],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AccessGuard)
      .useValue({ canActivate: () => true })
      .compile()
    app = module.createNestApplication()
    await app.init()
    await app.listen(0)
    baseUrl = await app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  it('answers 413 when the screenshot is over the size cap', async () => {
    const form = new FormData()
    form.set('file', new Blob([new Uint8Array(MAX_ARTIFACT_BYTES + 1)], { type: 'image/png' }), 'a.png')

    const response = await fetch(`${baseUrl}/organizations/00000000-0000-4000-8000-000000000001/artifacts`, { method: 'POST', body: form })

    expect(response.status).toBe(413)
  })
})
