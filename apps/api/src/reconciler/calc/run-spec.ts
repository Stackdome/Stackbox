import { CheckKind } from '@stackbox/contract'
import { EnvironmentType, NetworkAccess, REPORT_CHECK_FUNCTION, type StartRunSpec } from '../../ports'
import type { TaskSnapshot } from '../task-state'

export const RunPurpose = { Reproduce: 'reproduce', Implement: 'implement', Verify: 'verify' } as const
export type RunPurpose = (typeof RunPurpose)[keyof typeof RunPurpose]

export const WORKSPACE_REPO = '/workspace/repo'
// Files under /workspace/outputs are published as artifacts when a turn completes.
export const PATCH_PATH = '/workspace/outputs/fix.patch'

const INSTRUCTIONS: Record<RunPurpose, string> = {
  [RunPurpose.Reproduce]: `Reproduce the report against the code in ${WORKSPACE_REPO}. Call ${REPORT_CHECK_FUNCTION} once with checkKind ${CheckKind.ReportReproduced} and your outcome.`,
  [RunPurpose.Implement]: `Fix the report in ${WORKSPACE_REPO}. Commit the change and write its git format-patch output to ${PATCH_PATH}.`,
  [RunPurpose.Verify]: `Open the instance URL from the run context in a browser and confirm the report no longer happens. Call ${REPORT_CHECK_FUNCTION} once with checkKind ${CheckKind.FixVerified} and your outcome.`,
}

export function headRefFor(taskId: string): string {
  return `stackbox/${taskId}`
}

export function baseRefOf(snapshot: Pick<TaskSnapshot, 'task' | 'repository'>): string {
  return snapshot.task.targetBranch ?? snapshot.repository.defaultBranch
}

export function runSpecFor(input: {
  snapshot: TaskSnapshot
  purpose: RunPurpose
  instanceUrl: string | null
  gitHost: string
  readToken: string
}): StartRunSpec {
  const { snapshot, purpose, instanceUrl, gitHost, readToken } = input
  const allowedDomains = instanceUrl === null ? [gitHost] : [gitHost, new URL(instanceUrl).hostname]
  return {
    environment: {
      type: EnvironmentType.OpenAiHosted,
      // The token stays in env so it never appears in the command text the agent can read back.
      setupCommands: [
        {
          command: `git clone --branch ${baseRefOf(snapshot)} https://x-access-token:$GIT_READ_TOKEN@${gitHost}/${snapshot.repository.fullName}.git ${WORKSPACE_REPO}`,
        },
      ],
      env: { GIT_READ_TOKEN: readToken },
      network: { access: NetworkAccess.Restricted, allowedDomains },
    },
    instructions: INSTRUCTIONS[purpose],
    context: {
      taskId: snapshot.task.id,
      reportDescription: snapshot.report.description,
      instanceUrl: instanceUrl ?? undefined,
      expectedBehaviour: snapshot.report.expectedBehaviour ?? undefined,
    },
    input: snapshot.report.description,
  }
}
