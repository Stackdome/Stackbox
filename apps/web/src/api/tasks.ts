import type { components } from '@stackbox/contract'
import api from './client'

type TaskList = components['schemas']['TaskList']
type TaskSummary = components['schemas']['TaskSummary']

export async function fetchTasks(orgId: string): Promise<TaskList> {
  const { data } = await api.get<TaskList>(`/organizations/${orgId}/tasks`)
  return data
}

export async function fetchTask(orgId: string, taskId: string): Promise<TaskSummary> {
  const { data } = await api.get<TaskSummary>(`/organizations/${orgId}/tasks/${taskId}`)
  return data
}

export async function cancelTask(orgId: string, taskId: string): Promise<TaskSummary> {
  const { data } = await api.post<TaskSummary>(`/organizations/${orgId}/tasks/${taskId}/cancel`)
  return data
}
