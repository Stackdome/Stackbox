import { ArtifactKind, CheckKind, CheckOutcome, ExecutionStatus, ReleaseStatus, TaskPhase, TaskResolution } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import type { StartRunSpec, StartedRun } from '../ports'
import {
  InMemoryAgentRuntime,
  InMemoryClock,
  InMemoryDeployTarget,
  InMemoryGitProvider,
  InMemorySandboxProvider,
  reportCheckCall,
  turnCompleted,
} from '../ports/fakes'
import {
  aCheck,
  aRelease,
  aRepository,
  aRun,
  aRunSpec,
  aSandbox,
  aSnapshot,
  aTask,
  anExecution,
} from '../tasks/test-support/builders'
import { TaskEventKind } from '../tasks/types'
import { TICK_PERIOD_MS } from './calc/lease'
import { PATCH_PATH } from './calc/run-spec'
import { InMemoryTaskState } from './in-memory-task-state'
import { ReconcilerService } from './reconciler.service'
import type { ExecutionPatch } from './task-state'

class StartFailingOnceRuntime extends InMemoryAgentRuntime {
  private failing = false

  failNextStart(): void {
    this.failing = true
  }

  override async startRun(spec: StartRunSpec): Promise<StartedRun> {
    if (!this.failing) return super.startRun(spec)
    this.failing = false
    throw new Error('503 Service Unavailable')
  }
}

class CursorWriteFailingOnceState extends InMemoryTaskState {
  private failing = false

  failNextCursorWrite(): void {
    this.failing = true
  }

  override async updateExecution(executionId: string, patch: ExecutionPatch): Promise<void> {
    if (!this.failing || patch.eventCursor === undefined) return super.updateExecution(executionId, patch)
    this.failing = false
    throw new Error('process died before the cursor write')
  }
}

function aReconciler() {
  const clock = new InMemoryClock(new Date('2026-09-13T10:00:00Z'))
  const state = new CursorWriteFailingOnceState()
  const sandboxes = new InMemorySandboxProvider()
  const runtime = new StartFailingOnceRuntime(sandboxes, clock)
  const deploy = new InMemoryDeployTarget()
  deploy.settleReleasesAs(ReleaseStatus.Live)
  const git = new InMemoryGitProvider()
  git.seedRepository({ summary: aRepository(), headSha: 'origin-sha' })
  const settings = { owner: 'replica-a', claimLimit: 10, gitHost: 'github.com', readToken: 'read-token' }
  const service = new ReconcilerService(state, runtime, sandboxes, deploy, git, clock, settings)
  return { clock, state, sandboxes, runtime, deploy, service }
}

async function anInstanceWithLiveOrigin(deploy: InMemoryDeployTarget) {
  const instance = await deploy.createInstance({ applicationId: 'A1', services: [], variables: {} })
  await deploy.deployRelease(instance, { commitSha: 'origin-sha', variables: {} })
  return instance
}

describe('the reconciler', () => {
  it('walks a fake task from intake to hand_over without a database', async () => {
    const { clock, state, runtime, service } = aReconciler()
    state.seed(aSnapshot())
    runtime.queueRun({
      events: [
        reportCheckCall('call-1', { checkKind: CheckKind.ReportReproduced, outcome: CheckOutcome.Passed, artifacts: [] }),
        turnCompleted(20),
      ],
    })
    runtime.queueRun({ files: [{ path: PATCH_PATH, data: Buffer.from('From 1 Mon Sep 17 00:00:00 2001') }], events: [turnCompleted(40)] })
    runtime.queueRun({
      events: [
        reportCheckCall('call-2', {
          checkKind: CheckKind.FixVerified,
          outcome: CheckOutcome.Passed,
          artifacts: [{ kind: ArtifactKind.Screenshot, url: 'https://artifacts.test/fixed.png' }],
        }),
        turnCompleted(30),
      ],
    })

    for (let tick = 0; tick < 20 && (await state.load('T1')).task.completedAt === null; tick += 1) {
      await service.tick()
      clock.advance(TICK_PERIOD_MS)
    }

    const { task, checks, pullRequest } = await state.load('T1')
    expect({
      phase: task.phase,
      resolution: task.resolution,
      checks: checks.map((check) => check.kind),
      draftPullRequest: pullRequest?.isDraft,
      sessionsLeft: runtime.sessionIds(),
    }).toEqual({
      phase: TaskPhase.HandOver,
      resolution: TaskResolution.FixVerified,
      checks: [CheckKind.InstanceReady, CheckKind.ReportReproduced, CheckKind.FixVerified],
      draftPullRequest: true,
      sessionsLeft: [],
    })
  })

  it('reconciles an existing session instead of creating a second one for the same idempotency key', async () => {
    const { state, runtime, deploy, service } = aReconciler()
    const instance = await anInstanceWithLiveOrigin(deploy)
    const existing = await runtime.startRun(aRunSpec())
    state.seed(
      aSnapshot({
        task: aTask({ phase: TaskPhase.Preparing, instanceId: instance.id }),
        releases: [aRelease()],
        checks: [aCheck()],
        executions: [anExecution({ idempotencyKey: 'T1:repro', sessionRef: existing.sessionId })],
      }),
    )
    await service.tick()
    await service.tick()
    expect(runtime.sessionIds()).toEqual([existing.sessionId])
  })

  it('stores the session id on the execution as soon as the run starts', async () => {
    const { state, deploy, service } = aReconciler()
    const instance = await anInstanceWithLiveOrigin(deploy)
    state.seed(aSnapshot({ task: aTask({ phase: TaskPhase.Preparing, instanceId: instance.id }), releases: [aRelease()] }))
    await service.tick()
    const { executions } = await state.load('T1')
    expect(executions.map((execution) => [execution.idempotencyKey, execution.sessionRef])).toEqual([['T1:repro', 'session-1']])
  })

  it('resumes reading items after the last stored item id', async () => {
    const { state, runtime, deploy, service } = aReconciler()
    const instance = await anInstanceWithLiveOrigin(deploy)
    runtime.queueRun({
      events: [
        reportCheckCall('call-1', { checkKind: CheckKind.ReportReproduced, outcome: CheckOutcome.Passed, artifacts: [] }),
        turnCompleted(),
      ],
    })
    const { sessionId } = await runtime.startRun(aRunSpec())
    const [lastItem] = (await runtime.items(sessionId)).slice(-1)
    state.seed(
      aSnapshot({
        task: aTask({ phase: TaskPhase.Reproducing, instanceId: instance.id }),
        releases: [aRelease()],
        executions: [anExecution({ sessionRef: sessionId, eventCursor: lastItem?.itemId ?? null })],
      }),
    )
    await service.tick()
    expect((await state.load('T1')).task.phase).toBe(TaskPhase.Reproducing)
  })

  it('ignores an instance_ready check reported by the agent and records that it did', async () => {
    const { state, runtime, deploy, service } = aReconciler()
    const instance = await anInstanceWithLiveOrigin(deploy)
    runtime.queueRun({
      events: [reportCheckCall('call-1', { checkKind: CheckKind.InstanceReady, outcome: CheckOutcome.Passed, artifacts: [] })],
    })
    const repro = await runtime.startRun(aRunSpec())
    state.seed(
      aSnapshot({
        task: aTask({ phase: TaskPhase.Reproducing, instanceId: instance.id }),
        releases: [aRelease()],
        executions: [anExecution({ sessionRef: repro.sessionId })],
      }),
    )
    await service.tick()
    const { checks } = await state.load('T1')
    expect({ checks, events: state.eventsOf('T1').map((event) => event.kind) }).toEqual({
      checks: [],
      events: [TaskEventKind.CheckIgnored],
    })
  })

  it('writes a budget_exceeded event when it abandons a task over the organization budget', async () => {
    const { state, deploy, service } = aReconciler()
    const instance = await anInstanceWithLiveOrigin(deploy)
    state.seed(
      aSnapshot({
        task: aTask({ phase: TaskPhase.Preparing, instanceId: instance.id, budgetCents: 100 }),
        releases: [aRelease()],
        executions: [anExecution({ sessionRef: null, status: ExecutionStatus.Failed, costCents: 100 })],
      }),
    )
    await service.tick()
    const { task } = await state.load('T1')
    expect({
      phase: task.phase,
      resolution: task.resolution,
      events: state.eventsOf('T1').map((event) => event.kind),
    }).toEqual({
      phase: TaskPhase.Failed,
      resolution: TaskResolution.Abandoned,
      events: [TaskEventKind.PhaseChanged, TaskEventKind.BudgetExceeded],
    })
  })

  it('cancels the run, destroys the sandbox and tears down the instance of a cancelled task', async () => {
    const { state, sandboxes, runtime, deploy, service } = aReconciler()
    const instance = await anInstanceWithLiveOrigin(deploy)
    const run = await runtime.startRun(aRunSpec())
    const environment = runtime.environmentOf(run.sessionId)
    state.seed(
      aSnapshot({
        task: aTask({ phase: TaskPhase.Cancelled, instanceId: instance.id }),
        sandboxes: [aSandbox({ externalId: environment.id })],
        executions: [anExecution({ sessionRef: run.sessionId })],
      }),
    )
    await service.tick()
    const { executions } = await state.load('T1')
    expect({
      executions: executions.map((execution) => execution.status),
      sessions: runtime.sessionIds(),
      sandboxDestroyed: sandboxes.isDestroyed(environment),
      instanceTornDown: deploy.isTornDown(instance),
    }).toEqual({ executions: [ExecutionStatus.Cancelled], sessions: [], sandboxDestroyed: true, instanceTornDown: true })
  })

  it('deletes the session and destroys the sandbox of a handed over task but keeps its instance for review', async () => {
    const { state, sandboxes, runtime, deploy, service } = aReconciler()
    const instance = await anInstanceWithLiveOrigin(deploy)
    const run = await runtime.startRun(aRunSpec())
    const environment = runtime.environmentOf(run.sessionId)
    state.seed(
      aSnapshot({
        task: aTask({ phase: TaskPhase.HandOver, resolution: TaskResolution.FixVerified, instanceId: instance.id }),
        sandboxes: [aSandbox({ externalId: environment.id })],
        executions: [anExecution({ sessionRef: run.sessionId, status: ExecutionStatus.Succeeded })],
      }),
    )
    await service.tick()
    expect({
      sessions: runtime.sessionIds(),
      sandboxDestroyed: sandboxes.isDestroyed(environment),
      instanceTornDown: deploy.isTornDown(instance),
      completed: (await state.load('T1')).task.completedAt !== null,
    }).toEqual({ sessions: [], sandboxDestroyed: true, instanceTornDown: false, completed: true })
  })

  it('deletes the session, destroys the sandbox and tears down the instance of a failed task', async () => {
    const { state, sandboxes, runtime, deploy, service } = aReconciler()
    const instance = await anInstanceWithLiveOrigin(deploy)
    const run = await runtime.startRun(aRunSpec())
    const environment = runtime.environmentOf(run.sessionId)
    state.seed(
      aSnapshot({
        task: aTask({ phase: TaskPhase.Failed, instanceId: instance.id }),
        sandboxes: [aSandbox({ externalId: environment.id })],
        executions: [anExecution({ sessionRef: run.sessionId, status: ExecutionStatus.Failed })],
      }),
    )
    await service.tick()
    expect({
      sessions: runtime.sessionIds(),
      sandboxDestroyed: sandboxes.isDestroyed(environment),
      instanceTornDown: deploy.isTornDown(instance),
    }).toEqual({ sessions: [], sandboxDestroyed: true, instanceTornDown: true })
  })

  it('marks a cancelled task complete once its cleanup has run, so no later tick claims it', async () => {
    const { state, deploy, service } = aReconciler()
    const instance = await anInstanceWithLiveOrigin(deploy)
    state.seed(aSnapshot({ task: aTask({ phase: TaskPhase.Cancelled, instanceId: instance.id }) }))
    await service.tick()
    expect((await state.load('T1')).task.completedAt).not.toBeNull()
  })
  describe('replaying a batch that stopped part way', () => {
    it('does not append report_reproduced twice when the implementation run fails to start once', async () => {
      const { state, runtime, deploy, service } = aReconciler()
      const instance = await anInstanceWithLiveOrigin(deploy)
      runtime.queueRun({
        events: [
          reportCheckCall('call-1', { checkKind: CheckKind.ReportReproduced, outcome: CheckOutcome.Passed, artifacts: [] }),
          turnCompleted(),
        ],
      })
      const repro = await runtime.startRun(aRunSpec())
      state.seed(
        aSnapshot({
          task: aTask({ phase: TaskPhase.Reproducing, instanceId: instance.id }),
          releases: [aRelease()],
          sandboxes: [aSandbox({ externalId: runtime.environmentOf(repro.sessionId).id })],
          executions: [anExecution({ sessionRef: repro.sessionId })],
        }),
      )
      runtime.failNextStart()
      await service.tick()
      await service.tick()
      const { task, checks } = await state.load('T1')
      expect({ phase: task.phase, checks: checks.map((check) => check.kind) }).toEqual({
        phase: TaskPhase.Implementing,
        checks: [CheckKind.ReportReproduced],
      })
    })

    it('does not burn run 2 when its start fails once after run 1 failed verification', async () => {
      const { state, runtime, deploy, service } = aReconciler()
      const instance = await anInstanceWithLiveOrigin(deploy)
      runtime.queueRun({
        events: [
          reportCheckCall('call-1', { checkKind: CheckKind.FixVerified, outcome: CheckOutcome.Failed, artifacts: [] }),
          turnCompleted(),
        ],
      })
      const verify = await runtime.startRun(aRunSpec())
      state.seed(
        aSnapshot({
          task: aTask({ phase: TaskPhase.Verifying, instanceId: instance.id, runLimit: 2 }),
          releases: [aRelease()],
          runs: [aRun({ candidateSha: 'pushed-sha-1' })],
          sandboxes: [aSandbox({ externalId: runtime.environmentOf(verify.sessionId).id })],
          executions: [anExecution({ idempotencyKey: 'T1:run1:verify', runId: 'T1-run1', sessionRef: verify.sessionId })],
        }),
      )
      runtime.failNextStart()
      await service.tick()
      await service.tick()
      const { task, runs, executions } = await state.load('T1')
      expect({
        phase: task.phase,
        runs: runs.map((run) => run.number),
        startedKeys: executions.filter((execution) => execution.sessionRef !== null).map((execution) => execution.idempotencyKey),
      }).toEqual({
        phase: TaskPhase.Implementing,
        runs: [1, 2],
        startedKeys: ['T1:run1:verify', 'T1:run2'],
      })
    })

    it('never pushes a patch from a stale repro turn replayed before its cursor was written', async () => {
      const { state, runtime, deploy, service } = aReconciler()
      const instance = await anInstanceWithLiveOrigin(deploy)
      runtime.queueRun({
        events: [
          reportCheckCall('call-1', { checkKind: CheckKind.ReportReproduced, outcome: CheckOutcome.Passed, artifacts: [] }),
          turnCompleted(),
        ],
      })
      runtime.queueRun({ files: [{ path: PATCH_PATH, data: Buffer.from('half a patch') }], events: [] })
      const repro = await runtime.startRun(aRunSpec())
      state.seed(
        aSnapshot({
          task: aTask({ phase: TaskPhase.Reproducing, instanceId: instance.id }),
          releases: [aRelease()],
          sandboxes: [aSandbox({ externalId: runtime.environmentOf(repro.sessionId).id })],
          executions: [anExecution({ sessionRef: repro.sessionId })],
        }),
      )
      state.failNextCursorWrite()
      await service.tick()
      await service.tick()
      const { task, runs } = await state.load('T1')
      expect({ phase: task.phase, candidateShas: runs.map((run) => run.candidateSha) }).toEqual({
        phase: TaskPhase.Implementing,
        candidateShas: [null],
      })
    })
  })
})
