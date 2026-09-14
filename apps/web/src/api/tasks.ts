import type { components } from '@stackbox/contract'
import api from './client'

type Schemas = components['schemas']

export async function fetchTasks(orgId: string): Promise<Schemas['TaskList']> {
  const { data } = await api.get<Schemas['TaskList']>(`/organizations/${orgId}/tasks`)
  return data
}

export async function fetchTaskDetail(orgId: string, taskId: string): Promise<Schemas['TaskDetail']> {
  const { data } = await api.get<Schemas['TaskDetail']>(`/organizations/${orgId}/tasks/${taskId}`)
  return data
}

export async function fetchTaskEvents(orgId: string, taskId: string): Promise<Schemas['TaskEventList']> {
  const { data } = await api.get<Schemas['TaskEventList']>(`/organizations/${orgId}/tasks/${taskId}/events`)
  return data
}

export async function fetchTaskChecks(orgId: string, taskId: string): Promise<Schemas['TaskCheckList']> {
  const { data } = await api.get<Schemas['TaskCheckList']>(`/organizations/${orgId}/tasks/${taskId}/checks`)
  return data
}

export async function fetchTaskRuns(orgId: string, taskId: string): Promise<Schemas['TaskRunList']> {
  const { data } = await api.get<Schemas['TaskRunList']>(`/organizations/${orgId}/tasks/${taskId}/runs`)
  return data
}

export async function fetchTaskMessages(orgId: string, taskId: string): Promise<Schemas['TaskMessageList']> {
  const { data } = await api.get<Schemas['TaskMessageList']>(`/organizations/${orgId}/tasks/${taskId}/messages`)
  return data
}

export async function createTask(orgId: string, input: Schemas['TaskCreate']): Promise<Schemas['TaskDetail']> {
  const { data } = await api.post<Schemas['TaskDetail']>(`/organizations/${orgId}/tasks`, input)
  return data
}

export async function replyToTask(orgId: string, taskId: string, body: string): Promise<Schemas['TaskMessage']> {
  const { data } = await api.post<Schemas['TaskMessage']>(`/organizations/${orgId}/tasks/${taskId}/messages`, { body })
  return data
}

export async function cancelTask(orgId: string, taskId: string): Promise<Schemas['TaskSummary']> {
  const { data } = await api.post<Schemas['TaskSummary']>(`/organizations/${orgId}/tasks/${taskId}/cancel`)
  return data
}
