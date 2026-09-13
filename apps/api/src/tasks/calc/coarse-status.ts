import { CoarseStatus, TaskPhase } from '@stackbox/contract'

export function coarseStatusOf(phase: TaskPhase): CoarseStatus {
  switch (phase) {
    case TaskPhase.NeedsInput:
      return CoarseStatus.NeedsYou
    case TaskPhase.HandOver:
      return CoarseStatus.ReadyForReview
    case TaskPhase.Failed:
      return CoarseStatus.Failed
    case TaskPhase.Cancelled:
      return CoarseStatus.Cancelled
    default:
      return CoarseStatus.Running
  }
}
