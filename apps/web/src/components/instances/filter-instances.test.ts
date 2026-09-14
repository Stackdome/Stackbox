import { CoarseStatus, InstancePurpose, InstanceStatus } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { makeInstanceDetail } from '../../../.storybook/fixtures'
import { toInstance } from '@/api/mappers/instance'
import { DEFAULT_INSTANCE_FILTER, filterInstances, isFiltered } from './filter-instances'

const SHOP_SCRATCH = toInstance(makeInstanceDetail({ id: 'aaaa0000', url: 'https://aaaa0000.instances.stackbox.test' }))
const SHOP_TORN_DOWN = toInstance(makeInstanceDetail({ id: 'bbbb0000', status: InstanceStatus.TornDown }))
const BILLING_TASK = toInstance(
  makeInstanceDetail({
    id: 'cccc0000',
    application: { id: 'app-billing', name: 'billing' },
    purpose: InstancePurpose.Task,
    status: InstanceStatus.Provisioning,
    owner: null,
    task: { id: 'task-4', description: 'Discount code is ignored', coarse_status: CoarseStatus.Running },
  }),
)
const ALL_THREE = [SHOP_SCRATCH, SHOP_TORN_DOWN, BILLING_TASK]
const ids = (views: typeof ALL_THREE) => views.map((view) => view.id)

describe('filterInstances', () => {
  it('hides torn down instances until Show torn down is on', () => {
    expect([ids(filterInstances(ALL_THREE, DEFAULT_INSTANCE_FILTER)), ids(filterInstances(ALL_THREE, { ...DEFAULT_INSTANCE_FILTER, showTornDown: true }))]).toEqual([
      ['aaaa0000', 'cccc0000'],
      ['aaaa0000', 'bbbb0000', 'cccc0000'],
    ])
  })

  it('narrows by application, purpose and status together', () => {
    const narrowed = filterInstances(ALL_THREE, { ...DEFAULT_INSTANCE_FILTER, applicationId: 'app-billing', purpose: InstancePurpose.Task, status: InstanceStatus.Provisioning })
    const nothing = filterInstances(ALL_THREE, { ...DEFAULT_INSTANCE_FILTER, applicationId: 'app-billing', purpose: InstancePurpose.Scratch })

    expect([ids(narrowed), ids(nothing)]).toEqual([['cccc0000'], []])
  })

  it('matches the search against the title, the url and the owner', () => {
    const search = (q: string) => ids(filterInstances(ALL_THREE, { ...DEFAULT_INSTANCE_FILTER, q }))

    expect([search('billing · task'), search('aaaa0000.instances'), search('discount'), search('ada')]).toEqual([['cccc0000'], ['aaaa0000'], ['cccc0000'], ['aaaa0000']])
  })

  it('counts a search, an application, a purpose or a status as a filter, but not Show torn down', () => {
    expect([isFiltered(DEFAULT_INSTANCE_FILTER), isFiltered({ ...DEFAULT_INSTANCE_FILTER, showTornDown: true }), isFiltered({ ...DEFAULT_INSTANCE_FILTER, q: 'shop' })]).toEqual([
      false,
      false,
      true,
    ])
  })
})
