import { describe, expect, it } from 'vitest'
import { PREVIEW_CATALOG_SEED } from '../../../.storybook/fixtures'
import { toApplicationListItem } from '@/api/mappers/application'
import { PreviewCatalog } from '@/preview/handlers/catalog'
import { filterApplications } from './filter-applications'

const applications = new PreviewCatalog(PREVIEW_CATALOG_SEED).applications().map(toApplicationListItem)

const namesFor = (q: string) => filterApplications(applications, q).map((application) => application.name)

describe('filterApplications', () => {
  it('keeps every application for an empty search', () => {
    expect(namesFor('  ')).toEqual(['billing', 'ledger', 'shop'])
  })

  it('narrows to applications whose name, repository or service names contain the search', () => {
    expect([namesFor('LED'), namesFor('acme/billing'), namesFor('worker')]).toEqual([['ledger'], ['billing', 'ledger'], ['shop']])
  })
})
