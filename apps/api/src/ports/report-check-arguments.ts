import { schemas } from '@stackbox/contract'
import { z } from 'zod'
import type { ReportCheckArguments } from './types'

const reportCheckArguments = z.object({
  checkKind: schemas.CheckKind,
  outcome: schemas.CheckOutcome,
  artifacts: z.array(z.object({ kind: schemas.ArtifactKind, url: z.string() })).default([]),
})

export const INVALID_REPORT_CHECK_MESSAGE = 'report_check arguments do not match the check contract'

// The tool schema asks the model for contract values; only this parse guarantees them.
export function parseReportCheckArguments(raw: unknown): ReportCheckArguments | null {
  const parsed = reportCheckArguments.safeParse(raw)
  return parsed.success ? (parsed.data as ReportCheckArguments) : null
}
