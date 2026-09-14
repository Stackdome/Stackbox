import { RepoProvider } from '@stackbox/contract'
import type { RepoRef, RepoSummary } from '../types'
import { InMemoryGitProvider } from './in-memory-git-provider'

export const DEMO_REPOSITORY: RepoSummary = {
  id: 'demo-repository',
  provider: RepoProvider.Github,
  externalId: 'demo',
  fullName: 'stackbox/demo-shop',
  defaultBranch: 'main',
}

const DEMO_ORIGIN_SHA = 'demo-origin-sha'

export class ScriptedGitProvider extends InMemoryGitProvider {
  constructor() {
    super()
    this.seedRepository({ summary: DEMO_REPOSITORY, headSha: DEMO_ORIGIN_SHA })
  }

  // Seeded and created tasks carry real repository ids; each is served as the demo repository.
  protected override repository(ref: RepoRef) {
    if (!this.hasRepository(ref)) this.seedRepository({ summary: { ...DEMO_REPOSITORY, id: ref.id }, headSha: DEMO_ORIGIN_SHA })
    return super.repository(ref)
  }
}
