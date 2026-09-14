import { TaskKind, type components } from '@stackbox/contract'
import type { ArtifactView } from './task-detail'

export const DEFAULT_RUN_LIMIT = 2

export type NewTaskDraft = {
  applicationId: string
  description: string
  expectedBehaviour: string
  screenshot: ArtifactView | null
  targetBranch: string
  runLimit: number
}

export function emptyDraft(applicationId = ''): NewTaskDraft {
  return { applicationId, description: '', expectedBehaviour: '', screenshot: null, targetBranch: '', runLimit: DEFAULT_RUN_LIMIT }
}

export function toTaskCreate(draft: NewTaskDraft): components['schemas']['TaskCreate'] {
  const expected = draft.expectedBehaviour.trim()
  const branch = draft.targetBranch.trim()
  return {
    application_id: draft.applicationId,
    description: draft.description.trim(),
    ...(expected ? { expected_behaviour: expected } : {}),
    ...(draft.screenshot ? { screenshot_artifact_id: draft.screenshot.id } : {}),
    ...(branch ? { target_branch: branch } : {}),
    run_limit: draft.runLimit,
    kind: TaskKind.Fix,
  }
}
