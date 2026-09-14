import { describe, expect, it } from 'vitest'
import type { DetectionView } from '@/api/mappers/application'
import { canFinish, canGoNext, connectFlowReducer, connectStages, initialConnectFlow, stackfilePathOf } from './connect-flow-state'

const detection: DetectionView = { sha: '9f8e7d6', services: [], error: null }

const chosen = connectFlowReducer(initialConnectFlow, {
  type: 'repository chosen',
  repositoryId: 'repo-design-system',
  fullName: 'acme/design-system',
  shortName: 'design-system',
})
const detecting = connectFlowReducer(chosen, { type: 'detect started' })
const detected = connectFlowReducer(detecting, { type: 'detect succeeded', detection })

describe('the connect application flow', () => {
  it('keeps Next disabled until a repository is chosen', () => {
    expect([canGoNext(initialConnectFlow), canGoNext(chosen)]).toEqual([false, true])
  })

  it('prefills the name and a derived slug from the chosen repository', () => {
    expect([chosen.name, chosen.slug]).toEqual(['design-system', 'design-system'])
  })

  it('stops deriving the slug from the name once the slug is edited by hand', () => {
    const edited = connectFlowReducer(detected, { type: 'slug changed', slug: 'ds' })

    const renamed = connectFlowReducer(edited, { type: 'name changed', name: 'Design System' })

    expect([renamed.name, renamed.slug]).toEqual(['Design System', 'ds'])
  })

  it('refuses to finish until the detection has answered', () => {
    expect([canFinish(detecting), canFinish(detected)]).toEqual([false, true])
  })

  it('refuses to finish with a slug that breaks the slug pattern', () => {
    expect(canFinish(connectFlowReducer(detected, { type: 'slug changed', slug: 'Design System' }))).toBe(false)
  })

  it('spins the stage tracker only while detection runs', () => {
    expect([initialConnectFlow, detecting, detected].map((state) => connectStages(state).map((stage) => stage.status))).toEqual([
      ['paused', 'todo'],
      ['done', 'active'],
      ['done', 'paused'],
    ])
  })

  it('reads an empty Stackfile path as the repository root default and trims a given one', () => {
    const pathed = connectFlowReducer(chosen, { type: 'path changed', stackfilePath: '  admin/stackfile.yaml ' })

    expect([stackfilePathOf(chosen), stackfilePathOf(pathed)]).toEqual([null, 'admin/stackfile.yaml'])
  })
})
