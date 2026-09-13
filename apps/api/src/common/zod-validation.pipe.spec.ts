import { describe, it, expect } from 'vitest'
import { BadRequestException } from '@nestjs/common'
import { schemas } from '@stackbox/contract'
import { ZodValidationPipe } from './zod-validation.pipe'

describe('the zod validation pipe', () => {
  it('returns the parsed body when it matches a generated contract schema', () => {
    const pipe = new ZodValidationPipe(schemas.LoginRequest)
    const body = { email: 'someone@example.com', password: 'correct horse' }
    expect(pipe.transform(body)).toEqual(body)
  })

  it('rejects a body that misses a required field, naming the field', () => {
    const pipe = new ZodValidationPipe(schemas.LoginRequest)
    let thrown: unknown
    try {
      pipe.transform({ email: 'someone@example.com' })
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(BadRequestException)
    expect(JSON.stringify(thrown)).toContain('password')
  })
})
