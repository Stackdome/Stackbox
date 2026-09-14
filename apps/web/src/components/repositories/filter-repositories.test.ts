import { RepoProvider } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { GITHUB_CONNECTION, GITLAB_CONNECTION, REPOSITORY_ROWS } from '../../../.storybook/fixtures'
import { toGitConnection, toRepository } from '@/api/mappers/repository'
import { NO_REPOSITORY_FILTER, filterRepositories } from './filter-repositories'

const connections = [GITHUB_CONNECTION, GITLAB_CONNECTION].map(toGitConnection)
const repositories = REPOSITORY_ROWS.map((row) => toRepository({ ...row, used_by: [] }))

const titlesOf = (groups: ReturnType<typeof filterRepositories>) => groups.map((group) => [group.connection.title, group.repositories.map((repository) => repository.fullName)])

describe('filterRepositories', () => {
  it('keeps every connection, the empty one included, when nothing is searched', () => {
    expect(titlesOf(filterRepositories(connections, repositories, NO_REPOSITORY_FILTER))).toEqual([
      ['GitHub acme', ['acme/billing', 'acme/design-system', 'acme/shop']],
      ['GitLab acme-platform', []],
    ])
  })

  it('drops a connection none of whose repositories match the search', () => {
    expect(titlesOf(filterRepositories(connections, repositories, { ...NO_REPOSITORY_FILTER, q: 'SHOP' }))).toEqual([['GitHub acme', ['acme/shop']]])
  })

  it('keeps only the connections of the chosen provider', () => {
    expect(titlesOf(filterRepositories(connections, repositories, { ...NO_REPOSITORY_FILTER, provider: RepoProvider.Gitlab }))).toEqual([['GitLab acme-platform', []]])
  })
})
