import { describe, expect, it } from 'vitest'
import { DEMO_CATALOGUE, DEMO_ORIGIN_SHA, DEMO_REPOSITORY, DEMO_STACKFILE, NEEDS_REAUTH_REF, ScriptedGitProvider } from './scripted-git-provider'

describe('the scripted git provider', () => {
  it('serves the demo repository head sha on its default branch', async () => {
    const git = new ScriptedGitProvider()
    expect(await git.headSha({ id: 'C1' }, DEMO_REPOSITORY, DEMO_REPOSITORY.defaultBranch)).toBe(DEMO_ORIGIN_SHA)
  })

  it('serves any repository id as the demo repository', async () => {
    const git = new ScriptedGitProvider()

    const sha = await git.headSha({ id: 'C1' }, { id: '00000000-0000-4000-8000-000000000003' }, 'main')

    expect(sha).toBe(DEMO_ORIGIN_SHA)
  })

  it('lists the six catalogue repositories by their stable external ids', async () => {
    const listed = await new ScriptedGitProvider().listRepositories({ id: 'acme' })

    expect(listed.map((summary) => [summary.externalId, summary.fullName])).toEqual([
      ['gh-1001', 'acme/shop'],
      ['gh-1002', 'acme/billing'],
      ['gh-1003', 'acme/design-system'],
      ['gh-1004', 'acme/acme-api'],
      ['gh-1005', 'acme/acme-web'],
      ['gh-1006', 'acme/infra'],
    ])
  })

  it('serves every catalogue repository at the demo head sha', async () => {
    const git = new ScriptedGitProvider()

    const heads = await Promise.all(DEMO_CATALOGUE.map((summary) => git.headSha({ id: 'acme' }, { id: summary.externalId }, 'main')))

    expect(new Set(heads)).toEqual(new Set([DEMO_ORIGIN_SHA]))
  })

  it('refuses to list repositories for a connection that needs re-auth', async () => {
    await expect(new ScriptedGitProvider().listRepositories({ id: NEEDS_REAUTH_REF })).rejects.toThrow()
  })

  it('serves the demo Stackfile for any path named stackfile.yaml and nothing for any other path', async () => {
    const git = new ScriptedGitProvider()
    const read = (path: string) => git.readFile({ id: 'acme' }, { id: 'gh-1001' }, DEMO_ORIGIN_SHA, path)

    const [root, nested, other] = await Promise.all([read('stackfile.yaml'), read('admin/stackfile.yaml'), read('missing/stackfile.yml')])

    expect([root?.toString('utf8'), nested?.toString('utf8'), other]).toEqual([DEMO_STACKFILE, DEMO_STACKFILE, null])
  })
})
