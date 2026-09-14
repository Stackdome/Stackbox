const MAX_SLUG_LENGTH = 63

export const FALLBACK_SLUG = 'application'

export function slugFrom(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, '')
  return slug || FALLBACK_SLUG
}
