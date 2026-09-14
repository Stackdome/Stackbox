import { CoarseStatus, InstanceExpiryHours, InstancePurpose, InstanceStatus, ReleaseStatus } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { makeInstanceDetail, makeRelease } from '../../../.storybook/fixtures'
import {
  IN_FLIGHT_REASON,
  NOT_RUNNING_REASON,
  deployBlockedReason,
  expiryLabel,
  liveInstances,
  needsPolling,
  toInstance,
  toInstanceDetail,
  toRelease,
  toSpinUpInput,
  toTaskInstance,
} from './instance'

const NOW = Date.parse('2026-09-14T10:00:00Z')
const at = (hoursFromNow: number) => new Date(NOW + hoursFromNow * 3_600_000).toISOString()

describe('the instance mapper', () => {
  it('names an instance by its application and a short identifier of its purpose and id', () => {
    const view = toInstance(makeInstanceDetail({ id: '4f2a0c1e-5b6d-4e7f-8a9b-0c1d2e3f4a50', purpose: InstancePurpose.LoadTest }))

    expect([view.identifier, view.title, view.purposeLabel]).toEqual(['load test 4f2a', 'shop · load test 4f2a', 'Load test'])
  })

  it('reads an expiry as No expiry, whole hours under a week and whole days past it, warning under six hours', () => {
    expect([expiryLabel(null, NOW), expiryLabel(at(71.5), NOW), expiryLabel(at(5), NOW), expiryLabel(at(0.5), NOW), expiryLabel(at(168), NOW)]).toEqual([
      { text: 'No expiry', tone: 'muted' },
      { text: 'in 71h', tone: 'muted' },
      { text: 'in 5h', tone: 'warning' },
      { text: 'in under 1h', tone: 'warning' },
      { text: 'in 7d', tone: 'muted' },
    ])
  })

  it('reads a passed expiry as how long ago it expired', () => {
    expect([expiryLabel(at(-2), NOW).text, expiryLabel(at(-0.25), NOW).text]).toEqual(['Expired 2h ago', 'Expired under 1h ago'])
  })

  it('says which run opened a release and summarises it by short sha and ref', () => {
    const view = toRelease(makeRelease({ commit_sha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678', ref: 'main', run_number: 2 }))

    expect([view.shaShort, view.summary, view.runLabel]).toEqual(['a1b2c3d', 'a1b2c3d · main', 'Run 2'])
  })

  it('names the task that owns a task instance, or the person who spun one up', () => {
    const task = toInstance(makeInstanceDetail({ owner: null, task: { id: 'task-1', description: 'Checkout button does nothing', coarse_status: CoarseStatus.NeedsYou } }))
    const spunUp = toInstance(makeInstanceDetail())

    expect([task.owner, spunUp.owner]).toEqual([
      { kind: 'task', taskId: 'task-1', description: 'Checkout button does nothing', coarseStatus: CoarseStatus.NeedsYou },
      { kind: 'user', name: 'Ada Lovelace' },
    ])
  })

  it('keeps polling while an instance provisions or a release is in flight, and stops once everything settled', () => {
    const provisioning = toInstanceDetail(makeInstanceDetail({ status: InstanceStatus.Provisioning }))
    const deploying = toInstanceDetail(makeInstanceDetail({ releases: [makeRelease({ status: ReleaseStatus.Building })] }))
    const settled = toInstanceDetail(makeInstanceDetail())

    expect([needsPolling(provisioning), needsPolling(deploying), needsPolling(settled)]).toEqual([true, true, false])
  })

  it('stops polling a torn down instance even with a release still queued', () => {
    const tornDown = toInstanceDetail(makeInstanceDetail({ status: InstanceStatus.TornDown, releases: [makeRelease({ status: ReleaseStatus.Queued })] }))

    expect(needsPolling(tornDown)).toBe(false)
  })

  it('blocks Deploy on an instance that stopped running and while a release is in flight', () => {
    const expired = toInstanceDetail(makeInstanceDetail({ status: InstanceStatus.Expired }))
    const queued = toInstanceDetail(makeInstanceDetail({ releases: [makeRelease({ status: ReleaseStatus.Queued })] }))
    const ready = toInstanceDetail(makeInstanceDetail())

    expect([deployBlockedReason(expired), deployBlockedReason(queued), deployBlockedReason(ready)]).toEqual([NOT_RUNNING_REASON, IN_FLIGHT_REASON, null])
  })

  it('keeps only the instances still running, five at most, for the Live instances block', () => {
    const statuses = [InstanceStatus.TornDown, InstanceStatus.Expired, ...Array(6).fill(InstanceStatus.Ready)]
    const views = statuses.map((status, index) => toInstance(makeInstanceDetail({ id: `id-${index}`, status })))

    expect(liveInstances(views).map((view) => view.id)).toEqual(['id-2', 'id-3', 'id-4', 'id-5', 'id-6'])
  })

  it('leaves a blank ref out of a spin up and sends No expiry as null', () => {
    expect([
      toSpinUpInput({ applicationId: 'app-shop', purpose: InstancePurpose.Persistent, ref: '  ', expiry: null }),
      toSpinUpInput({ applicationId: 'app-shop', purpose: InstancePurpose.Preview, ref: ' feature/checkout ', expiry: InstanceExpiryHours.Day }),
    ]).toEqual([
      { application_id: 'app-shop', purpose: InstancePurpose.Persistent, expires_in_hours: null },
      { application_id: 'app-shop', purpose: InstancePurpose.Preview, expires_in_hours: InstanceExpiryHours.Day, ref: 'feature/checkout' },
    ])
  })

  it('names a task instance for the task rail', () => {
    expect(toTaskInstance({ id: '7c3e1b2a-0000-4000-8000-000000000001', url: null, status: InstanceStatus.Ready, expires_at: null })).toEqual({
      id: '7c3e1b2a-0000-4000-8000-000000000001',
      identifier: 'task 7c3e',
      status: InstanceStatus.Ready,
    })
  })
})
