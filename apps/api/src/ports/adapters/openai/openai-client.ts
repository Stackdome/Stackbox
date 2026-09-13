export class OpenAiRequestError extends Error {
  constructor(
    readonly status: number,
    method: string,
    path: string,
    body: string,
  ) {
    super(`${method} ${path} returned ${status}: ${body}`)
  }
}

export class OpenAiClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = 'https://api.openai.com',
  ) {}

  async send(method: string, path: string, init: { body?: string | Uint8Array; contentType?: string; accept?: string } = {}): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'OpenAI-Beta': 'agents=v1',
        ...(init.contentType ? { 'Content-Type': init.contentType } : {}),
        ...(init.accept ? { Accept: init.accept } : {}),
      },
      body: init.body,
    })
    if (!response.ok) throw new OpenAiRequestError(response.status, method, path, await response.text())
    return response
  }

  async json<T>(method: string, path: string, body?: unknown): Promise<T> {
    const init = body === undefined ? {} : { body: JSON.stringify(body), contentType: 'application/json' }
    const response = await this.send(method, path, init)
    return (response.status === 204 ? {} : await response.json()) as T
  }

  async *eventStream(path: string): AsyncIterable<unknown> {
    const response = await this.send('GET', path, { accept: 'text/event-stream' })
    if (!response.body) return
    const decoder = new TextDecoder()
    let buffer = ''
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true })
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''
      for (const frame of frames) {
        const data = frame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n')
        if (data !== '' && data !== '[DONE]') yield JSON.parse(data)
      }
    }
  }
}

// Turns an expected status (a deleted session, a turn already over) into the fallback value instead of an error.
export async function unlessStatus<T>(statuses: number[], request: Promise<T>, fallback: T): Promise<T> {
  try {
    return await request
  } catch (error: unknown) {
    if (error instanceof OpenAiRequestError && statuses.includes(error.status)) return fallback
    throw error
  }
}
