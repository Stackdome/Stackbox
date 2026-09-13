import type { SandboxProvider } from '../ports'
import { EnvironmentStatus, type SandboxRef } from '../types'

type FakeEnvironment = { status: EnvironmentStatus; files: Map<string, Buffer>; destroyed: boolean }

export class InMemorySandboxProvider implements SandboxProvider {
  private readonly environments = new Map<string, FakeEnvironment>()

  provision(): SandboxRef {
    const id = `env-${this.environments.size + 1}`
    this.environments.set(id, { status: EnvironmentStatus.Provisioning, files: new Map(), destroyed: false })
    return { id }
  }

  setStatus(ref: SandboxRef, status: EnvironmentStatus): void {
    this.environment(ref).status = status
  }

  isDestroyed(ref: SandboxRef): boolean {
    return this.environment(ref).destroyed
  }

  async status(ref: SandboxRef): Promise<EnvironmentStatus> {
    return this.environment(ref).status
  }

  async connect(ref: SandboxRef, _remote: { remoteUrl: string }): Promise<void> {
    this.environment(ref)
  }

  async readFile(ref: SandboxRef, path: string): Promise<Buffer> {
    const data = this.environment(ref).files.get(path)
    if (!data) throw new Error(`no file at ${path} in ${ref.id}`)
    return data
  }

  async writeFile(ref: SandboxRef, path: string, data: Buffer): Promise<void> {
    this.environment(ref).files.set(path, data)
  }

  async destroy(ref: SandboxRef): Promise<void> {
    const environment = this.environment(ref)
    environment.destroyed = true
    environment.status = EnvironmentStatus.Disconnected
  }

  protected environment(ref: SandboxRef): FakeEnvironment {
    const found = this.environments.get(ref.id)
    if (!found) throw new Error(`unknown environment ${ref.id}`)
    return found
  }
}
