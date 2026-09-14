import type { Meta, StoryObj } from '@storybook/react-vite'
import { CheckKind, CheckOutcome, PrState, RunOutcome, TaskResolution } from '@stackbox/contract'
import { userEvent, within } from 'storybook/test'
import { TASK_DETAILS, type TaskDetailFixture, makeArtifact, makeTaskCheck, makeTaskRun } from '../../../.storybook/fixtures'
import { toCheck, toMessage, toRun, toTaskDetail, toTimelineEntry } from '@/api/mappers/task-detail'
import type { TaskDetailData } from '@/api/use-task-detail'
import { TaskDetail } from './task-detail'

function fixture(id: string): TaskDetailFixture {
  return TASK_DETAILS.filter((candidate) => candidate.detail.id === id)[0]
}

function dataOf(source: TaskDetailFixture): TaskDetailData {
  return {
    detail: toTaskDetail(source.detail, source.events),
    timeline: source.events.map(toTimelineEntry),
    checks: source.checks.map(toCheck),
    runs: source.runs.map(toRun),
    messages: source.messages.map(toMessage),
  }
}

const handedOver = fixture('task-5')

const meta = {
  title: 'Features/TaskDetail/TaskDetail',
  component: TaskDetail,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  args: { data: dataOf(fixture('task-3')), onReply: async () => {} },
} satisfies Meta<typeof TaskDetail>

export default meta
type Story = StoryObj<typeof meta>

/** State 1: reproducing, instance ready passed, report reproduced in flight, no runs. */
export const RunningReproducing: Story = {}

/** State 2: the question and the reply box first, the stepper paused on implementing. */
export const NeedsInput: Story = { args: { data: dataOf(fixture('task-1')) } }

/** State 3: run 1 failed verification, run 2 passed, pull request open and not a draft, evidence under the resolution. */
export const ReadyFixVerified: Story = {
  args: {
    data: dataOf({
      ...handedOver,
      detail: {
        ...handedOver.detail,
        run_number: 2,
        pull_requests: [{ number: 142, repository_full_name: 'acme/shop', state: PrState.Open, is_draft: false, head_ref: 'stackbox/task-5', base_ref: 'main' }],
      },
      checks: [
        ...handedOver.checks.filter((check) => check.kind !== CheckKind.FixVerified),
        makeTaskCheck({ id: 'v1', kind: CheckKind.FixVerified, outcome: CheckOutcome.Failed, run_number: 1 }),
        makeTaskCheck({ id: 'v2', kind: CheckKind.FixVerified, outcome: CheckOutcome.Passed, run_number: 2, artifacts: [makeArtifact({ id: 'evidence' })] }),
      ],
      runs: [
        makeTaskRun({ id: 'r1', outcome: RunOutcome.Failed, candidate_sha: 'b7e1c0d9aa01', cost_cents: 60, failed_check: makeTaskCheck({ id: 'v1', kind: CheckKind.FixVerified, outcome: CheckOutcome.Failed, run_number: 1 }) }),
        makeTaskRun({ id: 'r2', number: 2, outcome: RunOutcome.Passed, candidate_sha: 'e5f6a7b8c9d0', verified_sha: 'e5f6a7b8c9d0', cost_cents: 80 }),
      ],
    }),
  },
}

/** State 4: reproduction inconclusive, pull request open, the resolution warns the change is unproven. */
export const ReadyFixUnverified: Story = {
  args: {
    data: dataOf({
      ...handedOver,
      detail: {
        ...handedOver.detail,
        resolution: TaskResolution.FixUnverified,
        pull_requests: [{ number: 143, repository_full_name: 'acme/shop', state: PrState.Open, is_draft: true, head_ref: 'stackbox/task-5', base_ref: 'main' }],
      },
      checks: [makeTaskCheck({ id: 'ready' }), makeTaskCheck({ id: 'inconclusive', kind: CheckKind.ReportReproduced, outcome: CheckOutcome.Inconclusive })],
    }),
  },
}

/** State 5: both runs failed, resolution Abandoned, no pull request promoted. */
export const FailedAfterRunLimit: Story = {
  args: { data: dataOf({ ...fixture('task-7'), detail: { ...fixture('task-7').detail, resolution: TaskResolution.Abandoned } }) },
}

/** State 6: the agent could not observe the bug. */
export const NotReproduced: Story = { args: { data: dataOf(fixture('task-6')) } }

/** State 7: cancelled, labelled from the phase alone. */
export const Cancelled: Story = { args: { data: dataOf(fixture('task-8')) } }

/** A check screenshot opens the viewer. The 760 work width is asserted by the e2e spec in Task 11, where the browser viewport is wide enough for it; this Storybook browser project runs narrower than 792 so `DialogContent` caps at `calc(100% - 2rem)` here. */
export const OpensEvidence: Story = {
  args: ReadyFixVerified.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('tab', { name: 'Checks' }))
    await userEvent.click(canvas.getAllByRole('button', { name: 'Open screenshot' })[0])
    await within(document.body).findByTestId('artifact-viewer')
  },
}
