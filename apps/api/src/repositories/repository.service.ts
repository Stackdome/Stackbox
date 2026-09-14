import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConnectionStatus, type components } from '@stackbox/contract'
import { z } from 'zod'
import { GitConnectionStore, RepositoryStore } from '../db'
import { GIT_PROVIDER, type GitProvider, type RepoSummary } from '../ports'
import { availableRepositories, pickListed } from './calc/available'
import { CONNECTION_EXISTS, CONNECTION_NOT_FOUND, REPOSITORY_IN_USE, REPOSITORY_NOT_FOUND, UNKNOWN_REPOSITORY, connectionFailed } from './errors'
import { presentAvailable, presentConnection, presentRepository } from './presenters'
import type { ConnectionView, ProviderRepository } from './types'

type Schemas = components['schemas']

const uuid = z.string().uuid()

@Injectable()
export class RepositoryService {
  constructor(
    @Inject(GitConnectionStore) private readonly connections: GitConnectionStore,
    @Inject(RepositoryStore) private readonly repositories: RepositoryStore,
    @Inject(GIT_PROVIDER) private readonly git: GitProvider,
  ) {}

  async listConnections(orgId: string): Promise<Schemas['GitConnectionList']> {
    return { items: (await this.connections.listByOrg(orgId)).map(presentConnection) }
  }

  async connect(orgId: string, input: Schemas['GitConnectionCreate']): Promise<Schemas['GitConnection']> {
    if (await this.connections.exists(orgId, input.provider, input.account_login)) {
      throw new ConflictException(CONNECTION_EXISTS)
    }
    await this.listOrRefuse(input.account_login)
    const id = await this.connections.create({ orgId, provider: input.provider, login: input.account_login })
    return presentConnection(await this.connectionOrThrow(orgId, id))
  }

  async verify(orgId: string, connectionId: string): Promise<Schemas['GitConnection']> {
    const connection = await this.connectionOrThrow(orgId, connectionId)
    const status = await this.git.listRepositories({ id: connection.installationRef }).then(
      () => ConnectionStatus.Verified,
      () => ConnectionStatus.Error,
    )
    await this.connections.setStatus(connection.id, status)
    return presentConnection({ ...connection, status })
  }

  async available(orgId: string, connectionId: string): Promise<Schemas['AvailableRepositoryList']> {
    const connection = await this.connectionOrThrow(orgId, connectionId)
    const [listed, added] = await Promise.all([this.listOrRefuse(connection.installationRef), this.repositories.listByOrg(orgId)])
    return { items: availableRepositories(listed, added, connection.provider).map(presentAvailable) }
  }

  async listRepositories(orgId: string): Promise<Schemas['RepositoryList']> {
    return { items: (await this.repositories.listByOrg(orgId)).map(presentRepository) }
  }

  async add(orgId: string, input: Schemas['RepositoryAdd']): Promise<Schemas['RepositoryList']> {
    const connection = await this.connectionOrThrow(orgId, input.connection_id)
    const picked = pickListed(await this.listOrRefuse(connection.installationRef), input.external_ids)
    if (!picked) {
      throw new NotFoundException(UNKNOWN_REPOSITORY)
    }
    const added = await this.repositories.addMany(orgId, connection, picked)
    return { items: added.map((row) => presentRepository({ ...row, usedBy: [] })) }
  }

  async remove(orgId: string, repositoryId: string): Promise<void> {
    const found = uuid.safeParse(repositoryId).success ? await this.repositories.findInOrg(orgId, repositoryId) : null
    if (!found) {
      throw new NotFoundException(REPOSITORY_NOT_FOUND)
    }
    if (found.usedBy.length > 0) {
      throw new ConflictException({ ...REPOSITORY_IN_USE, applications: found.usedBy })
    }
    await this.repositories.remove(found.id)
  }

  async locate(orgId: string, repositoryId: string): Promise<ProviderRepository> {
    const found = uuid.safeParse(repositoryId).success ? await this.repositories.locate(orgId, repositoryId) : null
    if (!found) {
      throw new NotFoundException(UNKNOWN_REPOSITORY)
    }
    return found
  }

  headSha(repository: ProviderRepository): Promise<string> {
    return this.git.headSha({ id: repository.installationRef }, { id: repository.externalId }, repository.defaultBranch)
  }

  async readFile(repository: ProviderRepository, sha: string, path: string): Promise<string | null> {
    const file = await this.git.readFile({ id: repository.installationRef }, { id: repository.externalId }, sha, path)
    return file === null ? null : file.toString('utf8')
  }

  private async listOrRefuse(installationRef: string): Promise<RepoSummary[]> {
    try {
      return await this.git.listRepositories({ id: installationRef })
    } catch (error: unknown) {
      throw new BadRequestException(connectionFailed(error instanceof Error ? error.message : String(error)))
    }
  }

  private async connectionOrThrow(orgId: string, connectionId: string): Promise<ConnectionView> {
    const found = uuid.safeParse(connectionId).success ? await this.connections.findInOrg(orgId, connectionId) : null
    if (!found) {
      throw new NotFoundException(CONNECTION_NOT_FOUND)
    }
    return found
  }
}
