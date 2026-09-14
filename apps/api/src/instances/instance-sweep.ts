import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common'
import { InstanceStatus } from '@stackbox/contract'
import { InstanceStore } from '../db/instance-store'
import { CLOCK, type Clock, DEPLOY_TARGET, type DeployTarget } from '../ports'
import { TICK_PERIOD_MS } from '../reconciler/calc/lease'
import { ReleaseService } from '../releases/release.service'
import { nextStatus } from './calc/instance-status'
import type { InstanceRecord } from './types'

export type SweepSettings = { tickEnabled: boolean }

export const SWEEP_SETTINGS = Symbol('SweepSettings')

@Injectable()
export class InstanceSweep implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(InstanceSweep.name)
  private timer: ReturnType<typeof setInterval> | undefined
  private running = false

  constructor(
    @Inject(InstanceStore) private readonly instances: InstanceStore,
    @Inject(ReleaseService) private readonly releases: ReleaseService,
    @Inject(DEPLOY_TARGET) private readonly deploy: DeployTarget,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(SWEEP_SETTINGS) private readonly settings: SweepSettings,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.settings.tickEnabled) return
    this.timer = setInterval(() => {
      this.tick().catch((error: unknown) => this.logger.error(error))
    }, TICK_PERIOD_MS)
  }

  onModuleDestroy(): void {
    clearInterval(this.timer)
  }

  // ponytail: no lease, so two replicas poll the same rows; every write here is idempotent and forward-only. Add a lease when a second replica exists.
  async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      for (const release of await this.releases.inFlight()) {
        await this.releases.advance(release).catch((error: unknown) => this.logger.error(`release ${release.id} did not advance`, String(error)))
      }
      const now = this.clock.now()
      for (const instance of await this.instances.live()) {
        await this.settle(instance, now).catch((error: unknown) => this.logger.error(`instance ${instance.id} did not settle`, String(error)))
      }
    } finally {
      this.running = false
    }
  }

  private async settle(instance: InstanceRecord, now: Date): Promise<void> {
    const next = nextStatus({ status: instance.status, expiresAt: instance.expiresAt, latestRelease: instance.releases[0] ?? null, now })
    if (next !== instance.status) {
      await this.instances.setStatus(instance.id, next)
      if (next === InstanceStatus.Expired) await this.deploy.teardown({ id: instance.id })
    }
    if (instance.url === null) {
      await this.instances.setUrl(instance.id, await this.deploy.instanceUrl({ id: instance.id }))
    }
  }
}
