import { http, HttpResponse } from 'msw'
import { taskHandlers } from '../src/preview/handlers/tasks'
import { APPLICATIONS, TASK_DETAILS, TASK_SUMMARIES, makeUser } from './fixtures'

// Auth endpoints must always resolve: an unmocked 401 sends the api client
// through its refresh and, on failure, sends the story iframe to /login
// (src/api/client.ts).
export const baselineHandlers = [
  http.get('/api/v1/users/current', () => HttpResponse.json(makeUser())),
  http.post('/api/v1/auth/refresh', () => HttpResponse.json({ user: makeUser() })),
  http.post('/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
  ...taskHandlers(TASK_SUMMARIES, APPLICATIONS, TASK_DETAILS),
]
