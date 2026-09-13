import { RepoProvider } from '@stackbox/contract'
import type { RepoSummary } from '../types'
import { InMemoryGitProvider } from './in-memory-git-provider'

export const DEMO_REPOSITORY: RepoSummary = {
  id: 'demo-repository',
  provider: RepoProvider.Github,
  externalId: 'demo',
  fullName: 'stackbox/demo-shop',
  defaultBranch: 'main',
}

export class ScriptedGitProvider extends InMemoryGitProvider {
  constructor() {
    super()
    this.seedRepository({ summary: DEMO_REPOSITORY, headSha: 'demo-origin-sha' })
  }
}
