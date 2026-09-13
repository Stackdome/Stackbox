import type { SandboxProvider } from '../../ports'
import { EnvironmentStatus, type SandboxRef } from '../../types'
import { type OpenAiClient, unlessStatus } from './openai-client'

const KNOWN_STATUSES: readonly string[] = Object.values(EnvironmentStatus)

export class OpenAiSandboxProvider implements SandboxProvider {
  constructor(private readonly client: OpenAiClient) {}

  async status(ref: SandboxRef): Promise<EnvironmentStatus> {
    const request = this.client.json<{ status: string }>('GET', `/v1/agents/environments/${ref.id}`)
    const { status } = await unlessStatus([404], request, { status: EnvironmentStatus.Disconnected })
    return KNOWN_STATUSES.includes(status) ? (status as EnvironmentStatus) : EnvironmentStatus.Failed
  }

  // Hosted environments connect themselves; connect is a self_hosted operation.
  async connect(_ref: SandboxRef, _remote: { remoteUrl: string }): Promise<void> {}

  async readFile(ref: SandboxRef, path: string): Promise<Buffer> {
    // Live file download is on the unindexed Files and artifacts page; path as the design reference names it.
    const response = await this.client.send('GET', `/v1/agents/environments/${ref.id}/files/content?${new URLSearchParams({ path })}`)
    return Buffer.from(await response.arrayBuffer())
  }

  async writeFile(ref: SandboxRef, path: string, data: Buffer): Promise<void> {
    // Live file upload is on the unindexed Files and artifacts page; path as the design reference names it.
    await this.client.send('POST', `/v1/agents/environments/${ref.id}/files?${new URLSearchParams({ path })}`, {
      body: data,
      contentType: 'application/octet-stream',
    })
  }

  // Hosted environments are cleaned up by deleting their session; compute teardown is self_hosted only.
  async destroy(_ref: SandboxRef): Promise<void> {}
}
