import { CoarseStatus } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { TASK_SUMMARIES } from '../../../.storybook/fixtures'
import { toTask, type Task } from '@/api/mappers/task'
import { ALL, NO_FILTER, filterTasks } from './filter-tasks'

const tasks = TASK_SUMMARIES.map(toTask)
const idsOf = (filtered: Task[]) => filtered.map((task) => task.id)

describe('filterTasks', () => {
  it('keeps every task when nothing is filtered', () => {
    expect(filterTasks(tasks, NO_FILTER)).toHaveLength(tasks.length)
  })

  it('combines the status, application and search filters', () => {
    expect(idsOf(filterTasks(tasks, { status: CoarseStatus.Running, applicationId: 'app-billing', q: 'discount' }))).toEqual(['task-4'])
  })

  it('matches the search against the application name as well as the title', () => {
    expect(idsOf(filterTasks(tasks, { ...NO_FILTER, q: 'billing' }))).toEqual(['task-2', 'task-4', 'task-7'])
  })

  it('ignores case and surrounding spaces in the search', () => {
    expect(idsOf(filterTasks(tasks, { status: ALL, applicationId: ALL, q: '  SAFARI ' }))).toEqual(['task-1'])
  })
})
