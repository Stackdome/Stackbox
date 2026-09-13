import { Test } from '@nestjs/testing'
import { describe, it, expect, beforeEach } from 'vitest'
import { HealthController } from './health.controller'

describe('the health controller', () => {
  let controller: HealthController

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile()
    controller = moduleRef.get(HealthController)
  })

  it('reports ok so a load balancer can tell the process is serving', () => {
    expect(controller.check()).toEqual({ status: 'ok' })
  })
})
