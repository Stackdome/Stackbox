import { describe, expect, it } from 'vitest'
import { InMemoryClock } from '../ports/fakes'
import { aSnapshot, aTask, anExecution } from '../tasks/test-support/builders'
import { leaseFor } from './calc/lease'
import { InMemoryTaskState } from './in-memory-task-state'

const START = new Date('2026-09-13T10:00:00Z')

function aStateWith(...tasks: ReturnType<typeof aTask>[]): InMemoryTaskState {
  const state = new InMemoryTaskState()
  for (const task of tasks) state.seed(aSnapshot({ task }))
  return state
}

describe('the in-memory task state', () => {
  it('refuses to claim a task whose lease has not expired, and claims it once the lease is past', async () => {
    const clock = new InMemoryClock(START)
    const state = aStateWith(aTask({ leaseOwner: 'replica-a', leaseExpiresAt: new Date('2026-09-13T10:00:30Z') }))
    const whileHeld = await state.claim(leaseFor('replica-b', clock.now()), clock.now(), 10)
    clock.advance(30_000)
    const oncePast = await state.claim(leaseFor('replica-b', clock.now()), clock.now(), 10)
    expect([whileHeld.map((task) => task.id), oncePast.map((task) => task.id)]).toEqual([[], ['T1']])
  })

  it('writes the new owner and expiry onto a claimed task', async () => {
    const state = aStateWith(aTask())
    const [claimed] = await state.claim(leaseFor('replica-b', START), START, 10)
    expect(claimed).toMatchObject({ leaseOwner: 'replica-b', leaseExpiresAt: new Date('2026-09-13T10:00:30Z') })
  })

  it('claims no more tasks than the limit', async () => {
    const state = aStateWith(aTask({ id: 'T1' }), aTask({ id: 'T2' }), aTask({ id: 'T3' }))
    expect(await state.claim(leaseFor('replica-a', START), START, 2)).toHaveLength(2)
  })

  it('never claims a completed task', async () => {
    const state = aStateWith(aTask({ completedAt: START }))
    expect(await state.claim(leaseFor('replica-a', START), START, 10)).toEqual([])
  })

  it('makes a task claimable again once its lease is released', async () => {
    const state = aStateWith(aTask())
    await state.claim(leaseFor('replica-a', START), START, 10)
    await state.releaseLease('T1', 'replica-a')
    expect(await state.claim(leaseFor('replica-b', START), START, 10)).toHaveLength(1)
  })

  it('does not release a lease owned by another replica', async () => {
    const state = aStateWith(aTask())
    await state.claim(leaseFor('replica-a', START), START, 10)
    await state.releaseLease('T1', 'replica-b')
    expect(await state.claim(leaseFor('replica-c', START), START, 10)).toEqual([])
  })

  it('returns the stored execution when its idempotency key already exists', async () => {
    const state = aStateWith(aTask())
    await state.insertExecution(anExecution({ id: 'E1', idempotencyKey: 'T1:repro' }))
    const second = await state.insertExecution(anExecution({ id: 'E2', idempotencyKey: 'T1:repro' }))
    expect(second.id).toBe('E1')
  })

  it('loads an execution with its patched session, cursor and cost', async () => {
    const state = aStateWith(aTask())
    await state.insertExecution(anExecution({ sessionRef: null }))
    await state.updateExecution('E1', { sessionRef: 'session-7', eventCursor: 'item-3', costCents: 40 })
    const { executions } = await state.load('T1')
    expect(executions[0]).toMatchObject({ sessionRef: 'session-7', eventCursor: 'item-3', costCents: 40 })
  })
})
