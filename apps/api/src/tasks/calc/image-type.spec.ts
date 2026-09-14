import { describe, expect, it } from 'vitest'
import { imageTypeOf } from './image-type'

describe('imageTypeOf', () => {
  it('recognises a png by its signature', () => {
    expect(imageTypeOf(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe('image/png')
  })

  it('recognises a jpeg by its signature', () => {
    expect(imageTypeOf(Buffer.from([0xff, 0xd8, 0xff]))).toBe('image/jpeg')
  })

  it('recognises a gif by its signature', () => {
    expect(imageTypeOf(Buffer.from([0x47, 0x49, 0x46, 0x38]))).toBe('image/gif')
  })

  it('recognises a webp by its RIFF container', () => {
    const bytes = Buffer.concat([Buffer.from('RIFF', 'ascii'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP', 'ascii')])
    expect(imageTypeOf(bytes)).toBe('image/webp')
  })

  it('refuses bytes that match no image signature, however the upload was labelled', () => {
    expect(imageTypeOf(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'))).toBeNull()
  })
})
