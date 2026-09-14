import { ServiceKind, StackfileSync } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import {
  APPLICATION_DETAILS,
  PREVIEW_HEAD_SHA,
  PREVIEW_STALE_SHA,
  TASK_SUMMARIES,
  makeApplicationDetail,
} from '../../../.storybook/fixtures'
import { recentTasks, serviceChipsOf, slugFrom, syncViewOf, toApplicationDetail, toDetection } from './application'
import { toTask } from './task'

describe('the application mapper', () => {
  it('labels each Stackfile sync and gives only a stale one a line naming the short sha it was synced at', () => {
    const views = [
      syncViewOf(StackfileSync.Synced, PREVIEW_HEAD_SHA),
      syncViewOf(StackfileSync.Stale, PREVIEW_STALE_SHA),
      syncViewOf(StackfileSync.NotSynced, null),
      syncViewOf(StackfileSync.ValidationFailed, null),
    ]

    expect(views.map((view) => [view.label, view.line])).toEqual([
      ['Synced', null],
      ['Not synced since a1b2c3d', 'Not synced since a1b2c3d'],
      ['Not synced', null],
      ['Validation failed', null],
    ])
  })

  it('shows four service chips and counts the rest', () => {
    expect(serviceChipsOf(['api', 'web', 'worker', 'postgres', 'redis', 'queue'])).toEqual({ shown: ['api', 'web', 'worker', 'postgres'], more: 2 })
  })

  it('reads a missing Stackfile path as stackfile.yaml at the repository root', () => {
    const [billing, ledger] = APPLICATION_DETAILS.map(toApplicationDetail)

    expect([billing.stackfilePath, billing.customStackfilePath, ledger.stackfilePath]).toEqual(['stackfile.yaml', null, 'ledger/stackfile.yaml'])
  })

  it('describes a source service by repository and path and an image service by its image', () => {
    const shop = toApplicationDetail(makeApplicationDetail())

    expect(shop.services.map((service) => [service.name, service.source, service.shortSource])).toEqual([
      ['api', 'acme/shop/apps/api', 'shop'],
      ['web', 'acme/shop/apps/web', 'shop'],
      ['worker', 'acme/shop/apps/worker', 'shop'],
      ['postgres', 'postgres:17', 'postgres:17'],
    ])
  })

  it('labels credential kinds for people', () => {
    const billing = toApplicationDetail(APPLICATION_DETAILS[0])

    expect(billing.credentials.map((credential) => [credential.name, credential.kindLabel, credential.ref])).toEqual([
      ['smtp', 'Username password', 'vault://acme/smtp'],
      ['stripe', 'Token', 'vault://acme/stripe'],
    ])
  })

  it('reads detected services against the chosen repository', () => {
    const detection = toDetection(
      { sha: PREVIEW_HEAD_SHA, services: [{ name: 'api', path: 'apps/api', image: null, kind: ServiceKind.Source }], error: null },
      'acme/design-system',
    )

    expect(detection.services.map((service) => service.source)).toEqual(['acme/design-system/apps/api'])
  })

  it('derives a slug from a name the way the api does', () => {
    expect([slugFrom('Design System'), slugFrom('!!!')]).toEqual(['design-system', 'application'])
  })

  it('keeps the five tasks with the newest activity for the Overview', () => {
    expect(recentTasks(TASK_SUMMARIES.map(toTask)).map((task) => task.id)).toEqual(['task-3', 'task-1', 'task-4', 'task-2', 'task-5'])
  })
})
