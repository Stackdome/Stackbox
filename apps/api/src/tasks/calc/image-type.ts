const SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
]

function startsWith(bytes: Buffer, signature: number[]): boolean {
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte)
}

function isWebp(bytes: Buffer): boolean {
  return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
}

// The client's declared mime is never trusted; only these bytes decide the stored type.
export function imageTypeOf(bytes: Buffer): string | null {
  const matched = SIGNATURES.find((signature) => startsWith(bytes, signature.bytes))
  if (matched) return matched.mime
  return isWebp(bytes) ? 'image/webp' : null
}
