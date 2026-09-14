import type { NewTaskDraft } from '@/api/mappers/new-task'

export type DraftProblems = { application?: string; description?: string }

export function problemsOf(draft: NewTaskDraft): DraftProblems {
  return {
    ...(draft.applicationId ? {} : { application: 'Pick the application the bug is in' }),
    ...(draft.description.trim() ? {} : { description: 'Describe what went wrong' }),
  }
}
