import { ArtifactKind } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import type { ArtifactView } from '@/api/mappers/task-detail'
import { problemsOf } from './new-task-draft'
import { drawerReducer, initialDrawerState } from './new-task-drawer-state'

const artifact: ArtifactView = { id: 'artifact-1', kind: ArtifactKind.Screenshot, label: 'Screenshot', url: 'https://example.test/a.png', isImage: true, logLines: null }

describe('the new task drawer reducer', () => {
  it('clears the artifact id when an upload fails', () => {
    const uploaded = drawerReducer(initialDrawerState(), { type: 'upload succeeded', artifact })
    const failed = drawerReducer(uploaded, { type: 'upload failed', message: 'The screenshot did not upload. Try again.' })
    expect(failed.draft.screenshot).toBeNull()
    expect(failed.upload).toEqual({ status: 'failed', message: 'The screenshot did not upload. Try again.' })
  })

  it('resets to the initial state once a submit succeeds', () => {
    const filled = drawerReducer(initialDrawerState('app-shop'), { type: 'field changed', patch: { description: 'The cart badge shows zero.' } })
    const submitting = drawerReducer(filled, { type: 'submit started' })
    expect(drawerReducer(submitting, { type: 'submit succeeded' })).toEqual(initialDrawerState())
  })

  it('marks the description field error once submit is attempted with it empty', () => {
    const attempted = drawerReducer(initialDrawerState('app-shop'), { type: 'submit attempted' })
    expect(attempted.submit).toEqual({ status: 'attempted' })
    expect(problemsOf(attempted.draft)).toEqual({ description: 'Describe what went wrong' })
  })
})
