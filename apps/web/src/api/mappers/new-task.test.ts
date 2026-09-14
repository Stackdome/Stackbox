import { TaskKind } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { makeArtifact } from '../../../.storybook/fixtures'
import { emptyDraft, toTaskCreate } from './new-task'
import { toArtifact } from './task-detail'

describe('the new task mapper', () => {
  it('sends only the fields the reporter filled in, trimmed, as a fix', () => {
    const draft = { ...emptyDraft('app-shop'), description: '  The cart badge shows zero.  ' }

    expect(toTaskCreate(draft)).toEqual({ application_id: 'app-shop', description: 'The cart badge shows zero.', run_limit: 2, kind: TaskKind.Fix })
  })

  it('sends the screenshot, the expected behaviour, the branch and the run limit when given', () => {
    const draft = {
      ...emptyDraft('app-shop'),
      description: 'The cart badge shows zero.',
      expectedBehaviour: 'It counts the items.',
      screenshot: toArtifact(makeArtifact({ id: 'artifact-9' })),
      targetBranch: 'release',
      runLimit: 3,
    }

    expect(toTaskCreate(draft)).toEqual({
      application_id: 'app-shop',
      description: 'The cart badge shows zero.',
      expected_behaviour: 'It counts the items.',
      screenshot_artifact_id: 'artifact-9',
      target_branch: 'release',
      run_limit: 3,
      kind: TaskKind.Fix,
    })
  })
})
