import { type NewTaskDraft, emptyDraft } from '@/api/mappers/new-task'
import type { ArtifactView } from '@/api/mappers/task-detail'

export type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'done'; artifact: ArtifactView }
  | { status: 'failed'; message: string }

export type SubmitState =
  | { status: 'idle' }
  | { status: 'attempted' }
  | { status: 'submitting' }
  | { status: 'failed'; message: string }

export type DrawerState = {
  draft: NewTaskDraft
  upload: UploadState
  submit: SubmitState
}

export type DrawerAction =
  | { type: 'field changed'; patch: Partial<NewTaskDraft> }
  | { type: 'screenshot dropped' }
  | { type: 'upload succeeded'; artifact: ArtifactView }
  | { type: 'upload failed'; message: string }
  | { type: 'screenshot removed' }
  | { type: 'submit attempted' }
  | { type: 'submit started' }
  | { type: 'submit succeeded' }
  | { type: 'submit failed'; message: string }

export function initialDrawerState(lockedApplicationId?: string, initialDraft?: Partial<NewTaskDraft>): DrawerState {
  return {
    draft: { ...emptyDraft(lockedApplicationId), ...initialDraft },
    upload: { status: 'idle' },
    submit: { status: 'idle' },
  }
}

export function drawerReducer(state: DrawerState, action: DrawerAction): DrawerState {
  switch (action.type) {
    case 'field changed':
      return { ...state, draft: { ...state.draft, ...action.patch } }
    case 'screenshot dropped':
      return { ...state, upload: { status: 'uploading' } }
    case 'upload succeeded':
      return { ...state, upload: { status: 'done', artifact: action.artifact }, draft: { ...state.draft, screenshot: action.artifact } }
    case 'upload failed':
      return { ...state, upload: { status: 'failed', message: action.message }, draft: { ...state.draft, screenshot: null } }
    case 'screenshot removed':
      return { ...state, upload: { status: 'idle' }, draft: { ...state.draft, screenshot: null } }
    case 'submit attempted':
      return { ...state, submit: { status: 'attempted' } }
    case 'submit started':
      return { ...state, submit: { status: 'submitting' } }
    case 'submit succeeded':
      return initialDrawerState()
    case 'submit failed':
      return { ...state, submit: { status: 'failed', message: action.message } }
  }
}
