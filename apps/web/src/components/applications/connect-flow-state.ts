import { type DetectionView, SLUG_PATTERN, slugFrom } from '@/api/mappers/application'
import type { Stage } from '@/components/branded'

export const ConnectStep = { Repository: 'repository', Detect: 'detect' } as const
export type ConnectStep = (typeof ConnectStep)[keyof typeof ConnectStep]

export type DetectState =
  | { status: 'idle' }
  | { status: 'detecting' }
  | { status: 'done'; detection: DetectionView }
  | { status: 'failed' }

export type ConnectFlowState = {
  step: ConnectStep
  repositoryId: string
  repositoryFullName: string
  stackfilePath: string
  detect: DetectState
  name: string
  slug: string
  slugEdited: boolean
  finishing: boolean
  failure: string | null
}

export type ConnectFlowAction =
  | { type: 'repository chosen'; repositoryId: string; fullName: string; shortName: string }
  | { type: 'path changed'; stackfilePath: string }
  | { type: 'detect started' }
  | { type: 'detect succeeded'; detection: DetectionView }
  | { type: 'detect failed' }
  | { type: 'back' }
  | { type: 'name changed'; name: string }
  | { type: 'slug changed'; slug: string }
  | { type: 'finish started' }
  | { type: 'finish failed'; message: string }

export const initialConnectFlow: ConnectFlowState = {
  step: ConnectStep.Repository,
  repositoryId: '',
  repositoryFullName: '',
  stackfilePath: '',
  detect: { status: 'idle' },
  name: '',
  slug: '',
  slugEdited: false,
  finishing: false,
  failure: null,
}

export function connectFlowReducer(state: ConnectFlowState, action: ConnectFlowAction): ConnectFlowState {
  switch (action.type) {
    case 'repository chosen':
      return {
        ...state,
        repositoryId: action.repositoryId,
        repositoryFullName: action.fullName,
        name: action.shortName,
        slug: state.slugEdited ? state.slug : slugFrom(action.shortName),
      }
    case 'path changed':
      return { ...state, stackfilePath: action.stackfilePath }
    case 'detect started':
      return { ...state, step: ConnectStep.Detect, detect: { status: 'detecting' }, failure: null }
    case 'detect succeeded':
      return { ...state, detect: { status: 'done', detection: action.detection } }
    case 'detect failed':
      return { ...state, detect: { status: 'failed' } }
    case 'back':
      return { ...state, step: ConnectStep.Repository, detect: { status: 'idle' }, failure: null }
    case 'name changed':
      return { ...state, name: action.name, slug: state.slugEdited ? state.slug : slugFrom(action.name) }
    case 'slug changed':
      return { ...state, slug: action.slug, slugEdited: true }
    case 'finish started':
      return { ...state, finishing: true, failure: null }
    case 'finish failed':
      return { ...state, finishing: false, failure: action.message }
  }
}

export function canGoNext(state: ConnectFlowState): boolean {
  return state.repositoryId !== ''
}

export function canFinish(state: ConnectFlowState): boolean {
  return state.detect.status === 'done' && state.name.trim() !== '' && SLUG_PATTERN.test(state.slug) && !state.finishing
}

export function stackfilePathOf(state: ConnectFlowState): string | null {
  const path = state.stackfilePath.trim()
  return path === '' ? null : path
}

// The step waiting on the person is paused; only a detection in flight spins.
export function connectStages(state: ConnectFlowState): Stage[] {
  if (state.step === ConnectStep.Repository) {
    return [
      { key: ConnectStep.Repository, label: 'Repository', status: 'paused' },
      { key: ConnectStep.Detect, label: 'Detect services', status: 'todo' },
    ]
  }
  return [
    { key: ConnectStep.Repository, label: 'Repository', status: 'done' },
    { key: ConnectStep.Detect, label: 'Detect services', status: state.detect.status === 'detecting' ? 'active' : 'paused' },
  ]
}
