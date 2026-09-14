// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { RepoProvider } from '@stackbox/contract'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ORG_ID, PREVIEW_CATALOG_SEED } from '../../.storybook/fixtures'
import { catalogHandlers } from '@/preview/handlers/catalog'
import { useRepositories } from './use-repositories'

const server = setupServer()

async function loaded() {
  const hook = renderHook(() => useRepositories(ORG_ID))
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

describe('useRepositories', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => server.resetHandlers(...catalogHandlers(PREVIEW_CATALOG_SEED, { delayMs: 0 })))

  it('maps each connection with its repository count and every repository by full name', async () => {
    const { result } = await loaded()

    expect({
      connections: result.current.connections.map((connection) => [connection.title, connection.repositoryCount]),
      repositories: result.current.repositories.map((repository) => repository.fullName),
    }).toEqual({
      connections: [
        ['GitHub acme', 3],
        ['GitLab acme-platform', 0],
      ],
      repositories: ['acme/billing', 'acme/design-system', 'acme/shop'],
    })
  })

  it('answers the applications that block a remove and keeps the repository', async () => {
    const { result } = await loaded()

    const blocking = await act(async () => result.current.remove('repo-billing'))

    expect({ names: blocking?.map((application) => application.name), kept: result.current.repositories.some((repository) => repository.id === 'repo-billing') }).toEqual({
      names: ['billing', 'ledger'],
      kept: true,
    })
  })

  it('drops a removed repository once the list reloads', async () => {
    const { result } = await loaded()

    await act(async () => {
      await result.current.remove('repo-design-system')
    })

    expect(result.current.repositories.map((repository) => repository.fullName)).toEqual(['acme/billing', 'acme/shop'])
  })

  it('inserts added repositories under their connection', async () => {
    const { result } = await loaded()

    await act(async () => {
      await result.current.add('connection-acme', ['gh-1004', 'gh-1006'])
    })

    expect(result.current.repositories.filter((repository) => repository.connectionId === 'connection-acme').map((repository) => repository.fullName)).toEqual([
      'acme/acme-api',
      'acme/billing',
      'acme/design-system',
      'acme/infra',
      'acme/shop',
    ])
  })

  it('adds a verified connection with no repositories and flips a refused one to verified', async () => {
    const { result } = await loaded()

    await act(async () => {
      await result.current.connect({ provider: RepoProvider.Github, accountLogin: 'globex' })
      await result.current.verify('connection-platform')
    })

    expect(result.current.connections.map((connection) => [connection.title, connection.needsReauth, connection.repositoryCount])).toEqual([
      ['GitHub acme', false, 3],
      ['GitLab acme-platform', false, 0],
      ['GitHub globex', false, 0],
    ])
  })
})
