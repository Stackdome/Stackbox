import { describe, expect, it } from 'vitest'
import { DEMO_REPOSITORY, ScriptedGitProvider } from './scripted-git-provider'

describe('the scripted git provider', () => {
  it('serves the demo repository head sha on its default branch', async () => {
    const git = new ScriptedGitProvider()
    expect(await git.headSha({ id: 'C1' }, DEMO_REPOSITORY, DEMO_REPOSITORY.defaultBranch)).toBe('demo-origin-sha')
  })

  it('serves any repository id as the demo repository', async () => {
    const git = new ScriptedGitProvider()

    const sha = await git.headSha({ id: 'C1' }, { id: '00000000-0000-4000-8000-000000000003' }, 'main')

    expect(sha).toBe('demo-origin-sha')
  })
})
