import { randomUUID } from 'node:crypto'
import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common'
import {
  ArtifactOwner,
  ExecutionStatus,
  ReleaseStatus,
  RunOutcome,
  SandboxStatus,
  TaskPhase,
  type TaskResolution,
} from '@stackbox/contract'
import {
  AGENT_RUNTIME,
  type AgentRuntime,
  CLOCK,
  type Clock,
  DEPLOY_TARGET,
  type DeployTarget,
  EnvironmentType,
  GIT_PROVIDER,
  type GitProvider,
  type InstanceRef,
  SANDBOX_PROVIDER,
  type SandboxProvider,
  type StartedRun,
} from '../ports'
import { canTransition } from '../tasks/calc/phase-transitions'
import { TaskEventKind, type Execution, type Sandbox } from '../tasks/types'
import { type Decision, DecisionKind, type Observations, activeExecution, decide } from './calc/decide'
import { TICK_PERIOD_MS, leaseFor } from './calc/lease'
import { PATCH_PATH, baseRefOf, headRefFor, runSpecFor } from './calc/run-spec'
import { RECONCILER_SETTINGS, type ReconcilerSettings } from './settings'
import { PhaseConflict, TASK_STATE, type TaskSnapshot, type TaskState } from './task-state'

type DecisionOf<Kind extends Decision['kind']> = Extract<Decision, { kind: Kind }>

function present<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`${what} is missing`)
  return value
}

@Injectable()
export class ReconcilerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ReconcilerService.name)
  private timer: ReturnType<typeof setInterval> | undefined
  private running = false

  constructor(
    @Inject(TASK_STATE) private readonly state: TaskState,
    @Inject(AGENT_RUNTIME) private readonly runtime: AgentRuntime,
    @Inject(SANDBOX_PROVIDER) private readonly sandboxes: SandboxProvider,
    @Inject(DEPLOY_TARGET) private readonly deploy: DeployTarget,
    @Inject(GIT_PROVIDER) private readonly git: GitProvider,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(RECONCILER_SETTINGS) private readonly settings: ReconcilerSettings,
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

  async tick(): Promise<void> {
    // A tick that outlasts its own lease must not overlap the next timer firing.
    if (this.running) return
    this.running = true
    try {
      const now = this.clock.now()
      const tasks = await this.state.claim(leaseFor(this.settings.owner, now), now, this.settings.claimLimit)
      for (const task of tasks) {
        try {
          await this.reconcile(task.id)
        } catch (error: unknown) {
          this.logger.error(`task ${task.id} did not reconcile`, error instanceof Error ? error.stack : String(error))
        } finally {
          await this.state.releaseLease(task.id, this.settings.owner)
        }
      }
    } finally {
      this.running = false
    }
  }

  private async reconcile(taskId: string): Promise<void> {
    const snapshot = await this.state.load(taskId)
    const observations = await this.observe(snapshot)
    // The phase each decision was decided from; a stored phase that has since moved on stops the batch.
    let expectedPhase = snapshot.task.phase
    try {
      for (const decision of decide(snapshot, observations, this.clock.now())) {
        const fresh = await this.state.load(taskId)
        if (fresh.task.phase !== expectedPhase) throw new PhaseConflict(taskId, expectedPhase, fresh.task.phase)
        await this.execute(decision, fresh, expectedPhase)
        if (decision.kind === DecisionKind.Transition) expectedPhase = decision.to
        if (decision.kind === DecisionKind.FailBudgetExceeded) expectedPhase = TaskPhase.Failed
      }
    } catch (error: unknown) {
      // A phase written outside the loop wins; the next tick observes it and decides again.
      if (error instanceof PhaseConflict) return
      throw error
    }
  }

  private async observe(snapshot: TaskSnapshot): Promise<Observations> {
    const release = snapshot.releases.at(-1)
    const instance: InstanceRef | null = snapshot.task.instanceId === null ? null : { id: snapshot.task.instanceId }
    const execution = activeExecution(snapshot)
    return {
      headSha:
        instance && !release
          ? await this.git.headSha({ id: snapshot.connection.id }, { id: snapshot.repository.id }, baseRefOf(snapshot))
          : null,
      releaseStatus: release ? (await this.deploy.releaseStatus({ id: release.id })).status : null,
      instanceUrl: instance ? await this.deploy.instanceUrl(instance) : null,
      events:
        execution && execution.sessionRef !== null
          ? await this.runtime.items(execution.sessionRef, { after: execution.eventCursor ?? undefined })
          : [],
    }
  }

  private async execute(decision: Decision, snapshot: TaskSnapshot, expectedPhase: TaskPhase): Promise<void> {
    const now = this.clock.now()
    switch (decision.kind) {
      case DecisionKind.CreateInstance:
        return this.createInstance(snapshot, expectedPhase, now)
      case DecisionKind.DeployRelease:
        return this.deployRelease(snapshot, expectedPhase, decision, now)
      case DecisionKind.OpenRun:
        return this.openRun(snapshot, decision, now)
      case DecisionKind.CloseRun:
        return this.closeRun(snapshot, decision, now)
      case DecisionKind.StartRun:
        return this.startRun(snapshot, expectedPhase, decision, now)
      case DecisionKind.RetrySameKey:
        return this.retrySameKey(snapshot, expectedPhase, decision)
      case DecisionKind.RecordExecution:
        return this.state.updateExecution(decision.executionId, decision.patch)
      case DecisionKind.SendMessage:
        return this.sendMessage(snapshot, decision, now)
      case DecisionKind.AppendCheck:
        return this.appendCheck(snapshot, decision, now)
      case DecisionKind.IgnoreCheck:
        return this.event(snapshot, TaskEventKind.CheckIgnored, { checkKind: decision.checkKind, executionId: decision.executionId, itemId: decision.itemId }, now)
      case DecisionKind.PushPatch:
        return this.pushPatch(snapshot, decision)
      case DecisionKind.OpenPullRequest:
        return this.openPullRequest(snapshot)
      case DecisionKind.Transition:
        return this.transition(snapshot, expectedPhase, decision.to, decision.resolution, now)
      case DecisionKind.FailBudgetExceeded:
        return this.failBudget(snapshot, expectedPhase, decision, now)
      case DecisionKind.CancelRun:
        return this.cancelRun(decision, now)
      case DecisionKind.DeleteSession:
        return this.runtime.deleteSession(decision.sessionId)
      case DecisionKind.DestroySandbox:
        return this.destroySandbox(snapshot, decision.sandboxId, now)
      case DecisionKind.TeardownInstance:
        return this.deploy.teardown({ id: decision.instanceId })
      case DecisionKind.Complete:
        return this.state.saveTask({ ...snapshot.task, completedAt: now }, expectedPhase)
    }
  }

  private async createInstance(snapshot: TaskSnapshot, expectedPhase: TaskPhase, now: Date): Promise<void> {
    const instance = await this.deploy.createInstance({ applicationId: snapshot.task.applicationId, services: [], variables: {} })
    await this.state.saveTask({ ...snapshot.task, instanceId: instance.id }, expectedPhase)
    await this.event(snapshot, TaskEventKind.InstanceRequested, { instanceId: instance.id }, now)
  }

  private async deployRelease(snapshot: TaskSnapshot, expectedPhase: TaskPhase, decision: DecisionOf<typeof DecisionKind.DeployRelease>, now: Date): Promise<void> {
    const instanceId = present(snapshot.task.instanceId, 'task instance')
    const release = await this.deploy.deployRelease({ id: instanceId }, { commitSha: decision.commitSha, variables: {} })
    await this.state.saveRelease({
      id: release.id,
      instanceId,
      runId: decision.runId,
      commitSha: decision.commitSha,
      ref: null,
      status: ReleaseStatus.Queued,
      createdAt: now,
    })
    if (decision.runId === null) await this.state.saveTask({ ...snapshot.task, originReleaseId: release.id }, expectedPhase)
  }

  private async openRun(snapshot: TaskSnapshot, decision: DecisionOf<typeof DecisionKind.OpenRun>, now: Date): Promise<void> {
    await this.state.saveRun({
      id: randomUUID(),
      taskId: snapshot.task.id,
      number: decision.number,
      candidateSha: null,
      verifiedSha: null,
      outcome: RunOutcome.Running,
      startedAt: now,
      endedAt: null,
    })
    await this.event(snapshot, TaskEventKind.RunStarted, { number: decision.number }, now)
  }

  private async closeRun(snapshot: TaskSnapshot, decision: DecisionOf<typeof DecisionKind.CloseRun>, now: Date): Promise<void> {
    const run = present(snapshot.runs.find((candidate) => candidate.id === decision.runId), `run ${decision.runId}`)
    await this.state.saveRun({ ...run, outcome: decision.outcome, verifiedSha: decision.verifiedSha, endedAt: now })
    await this.event(snapshot, TaskEventKind.RunEnded, { number: run.number, outcome: decision.outcome }, now)
  }

  private async sendMessage(snapshot: TaskSnapshot, decision: DecisionOf<typeof DecisionKind.SendMessage>, now: Date): Promise<void> {
    // The key is recorded before the remote call: a crash between the two drops the reply rather than sending it twice.
    await this.event(snapshot, TaskEventKind.MessageSent, { key: decision.key, messageId: decision.messageId }, now)
    await this.runtime.sendMessage(decision.sessionId, decision.body)
  }

  private async startRun(snapshot: TaskSnapshot, expectedPhase: TaskPhase, decision: DecisionOf<typeof DecisionKind.StartRun>, now: Date): Promise<void> {
    const run = snapshot.runs.find((candidate) => candidate.number === decision.runNumber)
    const sandbox: Sandbox = {
      id: randomUUID(),
      taskId: snapshot.task.id,
      provider: EnvironmentType.OpenAiHosted,
      externalId: null,
      status: SandboxStatus.Starting,
      createdAt: now,
      stoppedAt: null,
    }
    // The sandbox row is written before the key is read back, so a replayed start leaves a row with no external id.
    await this.state.saveSandbox(sandbox)
    const execution = await this.state.insertExecution({
      id: randomUUID(),
      sandboxId: sandbox.id,
      taskId: snapshot.task.id,
      runId: run?.id ?? null,
      externalId: null,
      sessionRef: null,
      idempotencyKey: decision.key,
      status: ExecutionStatus.Starting,
      costCents: 0,
      eventCursor: null,
      startedAt: now,
      endedAt: null,
    })
    // Reading the key back: an earlier tick already created this session.
    if (execution.sessionRef !== null) return
    await this.state.saveTask({ ...snapshot.task, costCents: decision.costCents }, expectedPhase)
    const started = await this.runtime.startRun(
      runSpecFor({ snapshot, purpose: decision.purpose, instanceUrl: decision.instanceUrl, gitHost: this.settings.gitHost, readToken: this.settings.readToken }),
    )
    await this.recordStart(execution, started, snapshot.sandboxes.find((stored) => stored.id === execution.sandboxId) ?? sandbox, {})
  }

  private async retrySameKey(snapshot: TaskSnapshot, expectedPhase: TaskPhase, decision: DecisionOf<typeof DecisionKind.RetrySameKey>): Promise<void> {
    const execution = present(snapshot.executions.find((candidate) => candidate.id === decision.executionId), `execution ${decision.executionId}`)
    const sandbox = present(snapshot.sandboxes.find((stored) => stored.id === execution.sandboxId), `sandbox ${execution.sandboxId}`)
    await this.state.saveTask({ ...snapshot.task, costCents: decision.costCents }, expectedPhase)
    const started = await this.runtime.startRun(
      runSpecFor({ snapshot, purpose: decision.purpose, instanceUrl: decision.instanceUrl, gitHost: this.settings.gitHost, readToken: this.settings.readToken }),
    )
    await this.recordStart(execution, started, sandbox, { eventCursor: null, costCents: decision.costCents })
  }

  private async recordStart(
    execution: Execution,
    started: StartedRun,
    sandbox: Sandbox,
    reset: { eventCursor?: null; costCents?: number },
  ): Promise<void> {
    await this.state.updateExecution(execution.id, {
      sessionRef: started.sessionId,
      externalId: started.turnId,
      status: ExecutionStatus.Running,
      ...reset,
    })
    await this.state.saveSandbox({ ...sandbox, externalId: started.environment?.id ?? null, status: SandboxStatus.Running })
  }

  private async appendCheck(snapshot: TaskSnapshot, decision: DecisionOf<typeof DecisionKind.AppendCheck>, now: Date): Promise<void> {
    const checkId = randomUUID()
    await this.state.appendCheck({
      id: checkId,
      taskId: snapshot.task.id,
      runId: decision.runId,
      releaseId: decision.releaseId,
      executionId: decision.executionId,
      itemId: decision.itemId,
      kind: decision.checkKind,
      outcome: decision.outcome,
      commitSha: decision.commitSha,
      ranAt: now,
    })
    for (const artifact of decision.artifacts) {
      await this.state.appendArtifact({
        id: randomUUID(),
        ownerType: ArtifactOwner.TaskCheck,
        ownerId: checkId,
        kind: artifact.kind,
        url: artifact.url,
        meta: {},
        createdAt: now,
      })
    }
    await this.event(snapshot, TaskEventKind.CheckRecorded, { checkId, checkKind: decision.checkKind, outcome: decision.outcome, runId: decision.runId }, now)
  }

  private async pushPatch(snapshot: TaskSnapshot, decision: DecisionOf<typeof DecisionKind.PushPatch>): Promise<void> {
    const run = present(snapshot.runs.find((candidate) => candidate.id === decision.runId), `run ${decision.runId}`)
    const execution = present(snapshot.executions.find((candidate) => candidate.id === decision.executionId), `execution ${decision.executionId}`)
    const sandbox = present(snapshot.sandboxes.find((stored) => stored.id === execution.sandboxId), `sandbox ${execution.sandboxId}`)
    const patch = await this.sandboxes.readFile({ id: present(sandbox.externalId, 'environment id') }, PATCH_PATH)
    const { sha } = await this.git.pushPatch(
      { id: snapshot.connection.id },
      { id: snapshot.repository.id },
      { baseRef: baseRefOf(snapshot), headRef: headRefFor(snapshot.task.id), patch },
    )
    await this.state.saveRun({ ...run, candidateSha: sha })
  }

  private async openPullRequest(snapshot: TaskSnapshot): Promise<void> {
    const summary = await this.git.openPullRequest({ id: snapshot.connection.id }, { id: snapshot.repository.id }, {
      headRef: headRefFor(snapshot.task.id),
      baseRef: baseRefOf(snapshot),
      title: `Fix: ${snapshot.report.description}`,
      body: `Verified against the Application Instance for task ${snapshot.task.id}.`,
      draft: true,
    })
    await this.state.savePullRequest({
      id: randomUUID(),
      taskId: snapshot.task.id,
      repositoryId: snapshot.repository.id,
      number: summary.number,
      headRef: summary.headRef,
      baseRef: summary.baseRef,
      isDraft: summary.isDraft,
      state: summary.state,
    })
  }

  private async transition(snapshot: TaskSnapshot, expectedPhase: TaskPhase, to: TaskPhase, resolution: TaskResolution | null, now: Date): Promise<void> {
    const from = expectedPhase
    if (!canTransition(from, to)) throw new Error(`task ${snapshot.task.id} cannot move from ${from} to ${to}`)
    await this.state.saveTask({ ...snapshot.task, phase: to, resolution }, expectedPhase)
    await this.event(snapshot, TaskEventKind.PhaseChanged, { from, to, ...(resolution === null ? {} : { resolution }) }, now)
  }

  private async failBudget(snapshot: TaskSnapshot, expectedPhase: TaskPhase, decision: DecisionOf<typeof DecisionKind.FailBudgetExceeded>, now: Date): Promise<void> {
    await this.state.saveTask({ ...snapshot.task, costCents: decision.costCents }, expectedPhase)
    await this.transition(await this.state.load(snapshot.task.id), expectedPhase, TaskPhase.Failed, decision.resolution, now)
    await this.event(snapshot, TaskEventKind.BudgetExceeded, { costCents: decision.costCents }, now)
  }

  private async cancelRun(decision: DecisionOf<typeof DecisionKind.CancelRun>, now: Date): Promise<void> {
    await this.runtime.cancel(decision.sessionId)
    await this.state.updateExecution(decision.executionId, { status: ExecutionStatus.Cancelled, endedAt: now })
  }

  private async destroySandbox(snapshot: TaskSnapshot, sandboxId: string, now: Date): Promise<void> {
    const sandbox = present(snapshot.sandboxes.find((stored) => stored.id === sandboxId), `sandbox ${sandboxId}`)
    await this.sandboxes.destroy({ id: present(sandbox.externalId, 'environment id') })
    await this.state.saveSandbox({ ...sandbox, status: SandboxStatus.Stopped, stoppedAt: now })
  }

  private event(snapshot: TaskSnapshot, kind: TaskEventKind, payload: Record<string, unknown>, at: Date): Promise<void> {
    return this.state.appendEvent({ id: randomUUID(), taskId: snapshot.task.id, kind, payload, at })
  }
}
