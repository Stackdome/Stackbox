import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { ConnectionStatus, RepoProvider } from '@stackbox/contract'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import type { Database } from '../db/client'
import { GitConnectionStore } from '../db/git-connection-store'
import { RepositoryStore } from '../db/repository-store'
import { IDS, emptyTables, insertApplicationOn, insertGitConnection, insertOrganization, insertRepository } from '../db/test-support/rows'
import type { GitProvider } from '../ports'
import { RepositoryService } from './repository.service'
import { RefusingGitProvider, aGitListing, aProviderRepository } from './test-support/builders'

const SHOP = aProviderRepository('gh-1001', 'acme/shop')
const ACME_API = aProviderRepository('gh-1004', 'acme/acme-api')

describe('RepositoryService', () => {
  let db: Database

  const serviceOver = (git: GitProvider) => new RepositoryService(new GitConnectionStore(db), new RepositoryStore(db), git)

  beforeAll(async () => {
    db = await migratedTestDatabase()
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org)
  })

  it('lists every application a repository backs when a remove is attempted', async () => {
    await insertRepository(db, { orgId: IDS.org, id: IDS.repository, name: 'shop' })
    await insertApplicationOn(db, { orgId: IDS.org, repositoryId: IDS.repository, id: IDS.application, name: 'shop' })
    await insertApplicationOn(db, { orgId: IDS.org, repositoryId: IDS.repository, id: IDS.secondApplication, name: 'shop-admin' })

    const refused = await serviceOver(aGitListing(SHOP)).remove(IDS.org, IDS.repository).catch((error: unknown) => error)

    expect(refused instanceof ConflictException && refused.getResponse()).toEqual({
      code: 'repository_in_use',
      message: 'Disconnect the applications this repository backs before removing it',
      applications: [
        { id: IDS.application, name: 'shop' },
        { id: IDS.secondApplication, name: 'shop-admin' },
      ],
    })
  })

  it('removes a repository no application backs', async () => {
    await insertRepository(db, { orgId: IDS.org, id: IDS.repository, name: 'shop' })
    const service = serviceOver(aGitListing(SHOP))

    await service.remove(IDS.org, IDS.repository)

    expect((await service.listRepositories(IDS.org)).items).toEqual([])
  })

  it('adds the repositories the provider lists and answers only the rows this call added', async () => {
    await insertGitConnection(db, IDS.org)
    const service = serviceOver(aGitListing(SHOP, ACME_API))
    await service.add(IDS.org, { connection_id: IDS.connection, external_ids: [SHOP.externalId] })

    const added = await service.add(IDS.org, { connection_id: IDS.connection, external_ids: [SHOP.externalId, ACME_API.externalId] })

    expect(added.items.map((item) => [item.full_name, item.used_by])).toEqual([['acme/acme-api', []]])
  })

  it('refuses an external id the provider does not list', async () => {
    await insertGitConnection(db, IDS.org)

    const refused = await serviceOver(aGitListing(SHOP))
      .add(IDS.org, { connection_id: IDS.connection, external_ids: ['gh-9999'] })
      .catch((error: unknown) => error)

    expect(refused instanceof NotFoundException && refused.getResponse()).toEqual({
      code: 'unknown_repository',
      message: 'Repository not found in this organization or provider',
    })
  })

  it('offers only the listed repositories the organization has not added', async () => {
    await insertRepository(db, { orgId: IDS.org, id: IDS.repository, name: 'shop', externalId: SHOP.externalId })

    const available = await serviceOver(aGitListing(SHOP, ACME_API)).available(IDS.org, IDS.connection)

    expect(available.items).toEqual([{ external_id: 'gh-1004', full_name: 'acme/acme-api', default_branch: 'main' }])
  })

  it('refuses to connect an account the provider will not list, and stores nothing', async () => {
    const service = serviceOver(new RefusingGitProvider())

    const refused = await service.connect(IDS.org, { provider: RepoProvider.Github, account_login: 'needs-reauth' }).catch((error: unknown) => error)

    expect({
      code: refused instanceof BadRequestException && (refused.getResponse() as { code: string }).code,
      stored: (await service.listConnections(IDS.org)).items.length,
    }).toEqual({ code: 'connection_failed', stored: 0 })
  })

  it('refuses a second connection for the same provider and login', async () => {
    const service = serviceOver(aGitListing(SHOP))
    await service.connect(IDS.org, { provider: RepoProvider.Github, account_login: 'acme' })

    const refused = await service.connect(IDS.org, { provider: RepoProvider.Github, account_login: 'acme' }).catch((error: unknown) => error)

    expect(refused instanceof ConflictException && refused.getResponse()).toEqual({
      code: 'connection_exists',
      message: 'This provider account is already connected',
    })
  })

  it('answers connection_exists, not a raw failure, when two connects race for the same provider account', async () => {
    const service = serviceOver(aGitListing(SHOP))

    const results = await Promise.allSettled([
      service.connect(IDS.org, { provider: RepoProvider.Github, account_login: 'acme' }),
      service.connect(IDS.org, { provider: RepoProvider.Github, account_login: 'acme' }),
    ])

    const fulfilled = results.filter((result) => result.status === 'fulfilled')
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    expect([fulfilled.length, rejected[0]?.reason instanceof ConflictException && rejected[0].reason.getResponse()]).toEqual([
      1,
      { code: 'connection_exists', message: 'This provider account is already connected' },
    ])
  })

  it('marks a connection error once the provider stops listing its repositories', async () => {
    await insertGitConnection(db, IDS.org)

    const answered = await serviceOver(new RefusingGitProvider()).verify(IDS.org, IDS.connection)
    const [stored] = (await serviceOver(aGitListing(SHOP)).listConnections(IDS.org)).items

    expect([answered.status, stored.status]).toEqual([ConnectionStatus.Error, ConnectionStatus.Error])
  })

  it('answers not found for a connection id that is not a uuid', async () => {
    await expect(serviceOver(aGitListing(SHOP)).available(IDS.org, 'not-a-uuid')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('reads a file of a located repository at a ref', async () => {
    await insertRepository(db, { orgId: IDS.org, id: IDS.repository, name: 'shop', externalId: SHOP.externalId })
    const git = aGitListing()
    git.seedRepository({ summary: SHOP, headSha: 'origin-sha', files: { 'stackfile.yaml': Buffer.from('services: {}') } })
    const service = serviceOver(git)
    const located = await service.locate(IDS.org, IDS.repository)

    expect([await service.headSha(located), await service.readFile(located, 'origin-sha', 'stackfile.yaml')]).toEqual(['origin-sha', 'services: {}'])
  })
})
