import { http, HttpResponse } from 'msw'
import { taskHandlers } from '../src/preview/handlers/tasks'
import { APPLICATIONS, TASK_DETAILS, TASK_SUMMARIES, makeUser } from './fixtures'

// Auth endpoints must always resolve: an unmocked 401 sends the axios client
// through its refresh flow and, on failure, hard-redirects the story iframe
// to /sign-in (src/api/client.ts).
export const baselineHandlers = [
  http.get('/api/v1/users/current', () => HttpResponse.json(makeUser())),
  http.post('/api/v1/auth/refresh', () =>
    HttpResponse.json({ token: 'sb-token', refreshToken: 'sb-refresh' }),
  ),
  ...taskHandlers(TASK_SUMMARIES, APPLICATIONS, TASK_DETAILS),
]
