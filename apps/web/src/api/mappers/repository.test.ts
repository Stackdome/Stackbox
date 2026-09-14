import { describe, expect, it } from 'vitest'
import { GITHUB_CONNECTION, GITLAB_CONNECTION, REPOSITORY_ROWS } from '../../../.storybook/fixtures'
import { addRepositoriesLabel, toGitConnection, toRepository } from './repository'

describe('the repository mapper', () => {
  it('says Needs re-auth under a connection the provider refused and nothing under a verified one', () => {
    expect([toGitConnection(GITLAB_CONNECTION).statusLine, toGitConnection(GITHUB_CONNECTION).statusLine]).toEqual(['Needs re-auth', null])
  })

  it('titles a connection by its provider and account login', () => {
    expect([toGitConnection(GITHUB_CONNECTION).title, toGitConnection(GITLAB_CONNECTION).title]).toEqual(['GitHub acme', 'GitLab acme-platform'])
  })

  it('links a GitHub repository to its page on the provider and names it by its short name', () => {
    const shop = toRepository({ ...REPOSITORY_ROWS[2], used_by: [{ id: 'app-shop', name: 'shop' }] })

    expect([shop.providerUrl, shop.shortName, shop.usedBy]).toEqual(['https://github.com/acme/shop', 'shop', [{ id: 'app-shop', name: 'shop' }]])
  })

  it('counts what an add will insert in the footer label', () => {
    expect([addRepositoriesLabel(0), addRepositoriesLabel(1), addRepositoriesLabel(2)]).toEqual(['Add 0 repositories', 'Add 1 repository', 'Add 2 repositories'])
  })
})
