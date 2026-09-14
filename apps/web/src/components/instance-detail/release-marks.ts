import { ReleaseStatus } from "@stackbox/contract";
import type { RailDotShape, TimelineTone } from "@/components/branded";

export const RELEASE_TONE: Record<ReleaseStatus, TimelineTone> = {
  [ReleaseStatus.Queued]: "muted",
  [ReleaseStatus.Building]: "amber",
  [ReleaseStatus.Live]: "ok",
  [ReleaseStatus.Failed]: "err",
};

// §16: solid landed, hollow never finished, spinner in flight.
export const RELEASE_SHAPE: Record<ReleaseStatus, RailDotShape> = {
  [ReleaseStatus.Queued]: "ring",
  [ReleaseStatus.Building]: "spinner",
  [ReleaseStatus.Live]: "solid",
  [ReleaseStatus.Failed]: "ring",
};
