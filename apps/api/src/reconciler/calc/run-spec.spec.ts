import { describe, expect, it } from 'vitest'
import { NetworkAccess } from '../../ports'
import { aSnapshot } from '../../tasks/test-support/builders'
import { RunPurpose, headRefFor, runSpecFor } from './run-spec'

const settings = { gitHost: 'github.com', readToken: 'read-token' }

describe('the run spec', () => {
  it('clones the target branch through a setup command that reads the token from env', () => {
    const spec = runSpecFor({ snapshot: aSnapshot(), purpose: RunPurpose.Reproduce, instanceUrl: null, ...settings })
    expect(spec.environment).toMatchObject({
      setupCommands: [
        { command: 'git clone --branch main https://x-access-token:$GIT_READ_TOKEN@github.com/acme/shop.git /workspace/repo' },
      ],
      env: { GIT_READ_TOKEN: 'read-token' },
    })
  })

  it('restricts network access to the git host for a reproduction run', () => {
    const spec = runSpecFor({ snapshot: aSnapshot(), purpose: RunPurpose.Reproduce, instanceUrl: null, ...settings })
    expect(spec.environment).toMatchObject({ network: { access: NetworkAccess.Restricted, allowedDomains: ['github.com'] } })
  })

  it('lets a verification run reach the instance host and names the instance url in its context', () => {
    const instanceUrl = 'https://instance-1.instances.test'
    const spec = runSpecFor({ snapshot: aSnapshot(), purpose: RunPurpose.Verify, instanceUrl, ...settings })
    expect([spec.environment, spec.context.instanceUrl]).toMatchObject([
      { network: { access: NetworkAccess.Restricted, allowedDomains: ['github.com', 'instance-1.instances.test'] } },
      instanceUrl,
    ])
  })

  it('names the head ref after the task', () => {
    expect(headRefFor('T1')).toBe('stackbox/T1')
  })
})
