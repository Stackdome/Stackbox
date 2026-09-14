import { PrState } from '@stackbox/contract'
import type { GitProvider } from '../ports'
import type { ConnectionRef, PullRequestSummary, RepoRef, RepoSummary } from '../types'

type SeededRepository = {
  summary: RepoSummary
  branches: Map<string, string>
  patches: Map<string, Buffer>
  pullRequests: PullRequestSummary[]
}

export class InMemoryGitProvider implements GitProvider {
  private readonly repositories = new Map<string, SeededRepository>()
  private pushes = 0

  seedRepository(seed: { summary: RepoSummary; headSha: string }): void {
    this.repositories.set(seed.summary.id, {
      summary: seed.summary,
      branches: new Map([[seed.summary.defaultBranch, seed.headSha]]),
      patches: new Map(),
      pullRequests: [],
    })
  }

  pushedPatch(repo: RepoRef, headRef: string): Buffer | undefined {
    return this.repository(repo).patches.get(headRef)
  }

  async listRepositories(_conn: ConnectionRef): Promise<RepoSummary[]> {
    return [...this.repositories.values()].map((repository) => repository.summary)
  }

  async listBranches(_conn: ConnectionRef, repo: RepoRef): Promise<string[]> {
    return [...this.repository(repo).branches.keys()]
  }

  async headSha(_conn: ConnectionRef, repo: RepoRef, branch: string): Promise<string> {
    const sha = this.repository(repo).branches.get(branch)
    if (sha === undefined) throw new Error(`unknown branch ${branch}`)
    return sha
  }

  async readFile(_conn: ConnectionRef, _repo: RepoRef, _ref: string, _path: string): Promise<Buffer | null> {
    return null
  }

  async pushPatch(conn: ConnectionRef, repo: RepoRef, spec: { baseRef: string; headRef: string; patch: Buffer }): Promise<{ sha: string }> {
    await this.headSha(conn, repo, spec.baseRef)
    this.pushes += 1
    const sha = `pushed-sha-${this.pushes}`
    const repository = this.repository(repo)
    repository.branches.set(spec.headRef, sha)
    repository.patches.set(spec.headRef, spec.patch)
    return { sha }
  }

  async openPullRequest(
    _conn: ConnectionRef,
    repo: RepoRef,
    spec: { headRef: string; baseRef: string; title: string; body: string; draft: boolean },
  ): Promise<PullRequestSummary> {
    const repository = this.repository(repo)
    const pullRequest: PullRequestSummary = {
      number: repository.pullRequests.length + 1,
      headRef: spec.headRef,
      baseRef: spec.baseRef,
      isDraft: spec.draft,
      state: PrState.Open,
    }
    repository.pullRequests.push(pullRequest)
    return pullRequest
  }

  async getPullRequest(_conn: ConnectionRef, repo: RepoRef, number: number): Promise<PullRequestSummary> {
    const found = this.repository(repo).pullRequests.find((pullRequest) => pullRequest.number === number)
    if (!found) throw new Error(`unknown pull request ${number}`)
    return found
  }

  protected repository(ref: RepoRef): SeededRepository {
    const found = this.repositories.get(ref.id)
    if (!found) throw new Error(`unknown repository ${ref.id}`)
    return found
  }

  protected hasRepository(ref: RepoRef): boolean {
    return this.repositories.has(ref.id)
  }
}
