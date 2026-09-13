import type { Clock } from '../ports'
import { EnvironmentStatus, type SandboxRef } from '../types'
import { InMemorySandboxProvider } from './in-memory-sandbox-provider'

export type EnvironmentStep = { afterMs: number; status: EnvironmentStatus }

export const DEFAULT_ENVIRONMENT_SCRIPT: readonly EnvironmentStep[] = [
  { afterMs: 0, status: EnvironmentStatus.Provisioning },
  { afterMs: 1_000, status: EnvironmentStatus.Connected },
]

export class ScriptedSandboxProvider extends InMemorySandboxProvider {
  private readonly provisionedAt = new Map<string, number>()

  constructor(
    private readonly clock: Clock,
    private readonly steps: readonly EnvironmentStep[] = DEFAULT_ENVIRONMENT_SCRIPT,
  ) {
    super()
  }

  override provision(): SandboxRef {
    const ref = super.provision()
    this.provisionedAt.set(ref.id, this.clock.now().getTime())
    return ref
  }

  override async status(ref: SandboxRef): Promise<EnvironmentStatus> {
    if (this.isDestroyed(ref)) return this.environment(ref).status
    const elapsed = this.clock.now().getTime() - (this.provisionedAt.get(ref.id) ?? 0)
    return this.steps.filter((step) => step.afterMs <= elapsed).at(-1)?.status ?? EnvironmentStatus.Provisioning
  }
}
