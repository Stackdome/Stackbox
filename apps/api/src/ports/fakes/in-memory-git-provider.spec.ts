import { PrState } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { aRepository } from '../../tasks/test-support/builders'
import { InMemoryGitProvider } from './in-memory-git-provider'

const connection = { id: 'C1' }
const repository = aRepository()

function aSeededGit(): InMemoryGitProvider {
  const git = new InMemoryGitProvider()
  git.seedRepository({ summary: repository, headSha: 'origin-sha' })
  return git
}

describe('the in-memory git provider', () => {
  it('serves the seeded head sha of the default branch', async () => {
    expect(await aSeededGit().headSha(connection, repository, 'main')).toBe('origin-sha')
  })

  it('points the head ref at a new sha after a patch is pushed', async () => {
    const git = aSeededGit()
    const { sha } = await git.pushPatch(connection, repository, {
      baseRef: 'main',
      headRef: 'stackbox/T1',
      patch: Buffer.from('From 1 Mon Sep 17 00:00:00 2001'),
    })
    expect(await git.headSha(connection, repository, 'stackbox/T1')).toBe(sha)
  })

  it('opens a draft pull request against the base branch', async () => {
    const pullRequest = await aSeededGit().openPullRequest(connection, repository, {
      headRef: 'stackbox/T1',
      baseRef: 'main',
      title: 'Fix the save button',
      body: 'Verified against the instance.',
      draft: true,
    })
    expect(pullRequest).toEqual({ number: 1, headRef: 'stackbox/T1', baseRef: 'main', isDraft: true, state: PrState.Open })
  })
})
