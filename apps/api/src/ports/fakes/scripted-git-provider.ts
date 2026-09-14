import { RepoProvider } from '@stackbox/contract'
import type { ConnectionRef, RepoRef, RepoSummary } from '../types'
import { InMemoryGitProvider } from './in-memory-git-provider'

export const DEMO_REPOSITORY: RepoSummary = {
  id: 'demo-repository',
  provider: RepoProvider.Github,
  externalId: 'demo',
  fullName: 'stackbox/demo-shop',
  defaultBranch: 'main',
}

export const DEMO_ORIGIN_SHA = 'demo-origin-sha'

// A connection whose installation ref is this string cannot list its repositories.
export const NEEDS_REAUTH_REF = 'needs-reauth'

const STACKFILE_NAME = 'stackfile.yaml'

export const DEMO_STACKFILE = [
  'services:',
  '  api: { path: apps/api, port: 3000 }',
  '  web: { path: apps/web, port: 5173 }',
  '  postgres: { image: postgres:17 }',
  '',
].join('\n')

export const DEMO_CATALOGUE: RepoSummary[] = [
  ['gh-1001', 'acme/shop'],
  ['gh-1002', 'acme/billing'],
  ['gh-1003', 'acme/design-system'],
  ['gh-1004', 'acme/acme-api'],
  ['gh-1005', 'acme/acme-web'],
  ['gh-1006', 'acme/infra'],
].map(([externalId, fullName]) => ({ id: externalId, provider: RepoProvider.Github, externalId, fullName, defaultBranch: 'main' }))

export class ScriptedGitProvider extends InMemoryGitProvider {
  constructor() {
    super()
    for (const summary of [DEMO_REPOSITORY, ...DEMO_CATALOGUE]) {
      this.seedRepository({ summary, headSha: DEMO_ORIGIN_SHA })
    }
  }

  override async listRepositories(conn: ConnectionRef): Promise<RepoSummary[]> {
    if (conn.id === NEEDS_REAUTH_REF) {
      throw new Error('The provider asks for this account to be connected again')
    }
    return DEMO_CATALOGUE
  }

  override async readFile(_conn: ConnectionRef, _repo: RepoRef, _ref: string, path: string): Promise<Buffer | null> {
    return path.slice(path.lastIndexOf('/') + 1) === STACKFILE_NAME ? Buffer.from(DEMO_STACKFILE) : null
  }

  // Seeded and created tasks carry real repository ids; each is served as the demo repository.
  protected override repository(ref: RepoRef) {
    if (!this.hasRepository(ref)) this.seedRepository({ summary: { ...DEMO_REPOSITORY, id: ref.id }, headSha: DEMO_ORIGIN_SHA })
    return super.repository(ref)
  }
}
