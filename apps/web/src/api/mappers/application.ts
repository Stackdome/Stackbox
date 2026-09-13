import type { components } from '@stackbox/contract'

export type Application = { id: string; name: string }

export function toApplication(summary: components['schemas']['ApplicationSummary']): Application {
  return { id: summary.id, name: summary.name }
}
