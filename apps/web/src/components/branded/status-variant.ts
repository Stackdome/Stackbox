import { CoarseStatus, ConnectionStatus, InstanceStatus, ReleaseStatus, StackfileSync } from "@stackbox/contract";

/**
 * The single word→variant brain. Every status string the backend can emit is
 * mapped here, categorized by resource domain, each case listing that
 * resource's complete closed vocabulary (source file noted per case).
 *
 * Rules: unknown non-empty word → "info" (visibly unrecognized, never a
 * silent green); empty/missing → "neutral". Matching is trimmed and
 * case-insensitive. Do NOT add regexes or share word lists across domains:
 * one case per resource is the point.
 */

export type StatusVariant = "ready" | "pending" | "error" | "info" | "neutral";

/**
 * Display word per variant. Cards, filter pills, and any other status
 * surface must speak the same language, so derive labels from here rather
 * than hardcoding words per component.
 */
export const statusVariantLabel: Record<StatusVariant, string> = {
  ready: "Ready",
  pending: "Pending",
  error: "Failed",
  info: "Unknown",
  neutral: "Unknown",
};

/**
 * Visual tone per variant for the "Status Strip" cards: `deploying` renders
 * the animated in-flight rail; settled tones color the status word only.
 */
export type StatusTone = "success" | "brand" | "danger" | "deploying";

export const statusVariantTone: Record<StatusVariant, StatusTone> = {
  ready: "success",
  pending: "deploying",
  error: "danger",
  info: "brand",
  neutral: "brand",
};

/**
 * Preview envs with no reported phase are still provisioning: treat a
 * missing phase as pending, not neutral. All preview status surfaces (cards,
 * filter buckets) must go through this so they agree.
 */
export function previewStatusVariant(phase?: string | null): StatusVariant {
  if (!(phase ?? "").trim()) return "pending";
  return statusVariant("preview", phase);
}

export type StatusDomain =
  | "stack"
  | "stack_rollup"
  | "resource"
  | "release"
  | "health"
  | "rollout"
  | "volume"
  | "addon"
  | "registry"
  | "storage"
  | "build"
  | "preview"
  | "git_connection"
  | "instance"
  | "stackfile_sync"
  | "task"
  | "generic";

export function statusVariant(domain: StatusDomain, state?: string | null): StatusVariant {
  const s = (state ?? "").trim().toLowerCase();
  if (!s) return "neutral";

  switch (domain) {
    // Deleting/Error declared but not emitted today, mapped anyway.
    case "stack":
      switch (s) {
        case "pending":
        case "progressing":
        case "deleting":
          return "pending";
        case "ready":
          return "ready";
        case "failed":
        case "degraded":
        case "error":
          return "error";
        default:
          return "info";
      }

    // The stacks list rolls lifecycle and release health into ONE word per
    // stack, so the word it shows is not any single backend enum. That rollup
    // is still a closed vocabulary, and it gets a domain of its own rather than
    // being smuggled through `health`, which has no word for "never deployed"
    // and would colour it blue-for-unknown.
    //
    // Produced by stackRollupState() in pages/stacks/components/list/status.ts.
    case "stack_rollup":
      switch (s) {
        case "deleting":
        case "deploying":
          return "pending";
        case "healthy":
          return "ready";
        // Degraded is amber, not red: it means the resource is serving, but
        // not fully. Unavailable and Failed both mean nothing is being
        // served, which is the distinction that decides whether you page
        // someone.
        case "degraded":
          return "pending";
        case "unavailable":
        case "failed":
          return "error";
        case "notdeployed":
          return "neutral";
        default:
          return "info";
      }

    case "resource":
      switch (s) {
        case "pending":
          return "pending";
        case "ready":
          return "ready";
        case "failed":
        case "error":
          return "error";
        default:
          return "info";
      }

    // The rail's spinner says a building release moves; the colour only says it has not landed.
    case "release":
      switch (s) {
        case ReleaseStatus.Queued:
          return "neutral";
        case ReleaseStatus.Building:
          return "info";
        case ReleaseStatus.Live:
          return "ready";
        case ReleaseStatus.Failed:
          return "error";
        default:
          return "info";
      }

    // Degraded still serves, so it is the warn tier; expired and torn down serve nothing and need nothing.
    case "instance":
      switch (s) {
        case InstanceStatus.Provisioning:
          return "info";
        case InstanceStatus.Ready:
          return "ready";
        case InstanceStatus.Degraded:
          return "pending";
        case InstanceStatus.Expired:
        case InstanceStatus.TornDown:
          return "neutral";
        default:
          return "info";
      }

    case "health":
      switch (s) {
        case "ok":
          return "ready";
        case "progressing":
        case "degraded":
          return "pending";
        case "unavailable":
        case "failed":
          return "error";
        default:
          return "info";
      }

    // Exactly 4 words.
    case "rollout":
      switch (s) {
        case "pending":
          return "pending";
        case "ready":
          return "ready";
        case "degraded":
        case "failed":
          return "error";
        default:
          return "info";
      }

    // Exactly 2 words.
    case "volume":
      switch (s) {
        case "pending":
          return "pending";
        case "ready":
          return "ready";
        default:
          return "info";
      }

    case "addon":
      switch (s) {
        case "pending":
        case "creating":
        case "initializing":
        case "updating":
        case "backing up":
        case "restoring":
        case "deleting":
          return "pending";
        case "ready":
          return "ready";
        case "error":
          return "error";
        case "hibernated":
        case "fenced":
          return "neutral";
        default:
          return "info";
      }

    // A connection either lists the account's repositories or needs the account connected again.
    case "git_connection":
      switch (s) {
        case ConnectionStatus.Verified:
          return "ready";
        case ConnectionStatus.Error:
          return "error";
        default:
          return "info";
      }

    // Stale is the warn tier: the application still runs, but its Stackfile moved on without it.
    case "stackfile_sync":
      switch (s) {
        case StackfileSync.Synced:
          return "ready";
        case StackfileSync.Stale:
          return "pending";
        case StackfileSync.NotSynced:
          return "neutral";
        case StackfileSync.ValidationFailed:
          return "error";
        default:
          return "info";
      }

    // `pending` is the warn tier, the one colour that means Needs you across
    // the product (the row accent and the sidebar badge spend the same token).
    case "task":
      switch (s) {
        case CoarseStatus.NeedsYou:
          return "pending";
        case CoarseStatus.Running:
          return "info";
        case CoarseStatus.ReadyForReview:
          return "ready";
        case CoarseStatus.Failed:
          return "error";
        default:
          return "neutral";
      }

    case "registry":
      switch (s) {
        case "pending":
          return "pending";
        case "running":
          return "ready";
        case "error":
          return "error";
        default:
          return "info";
      }

    // Not rendered yet; mapped for when it is.
    case "storage":
      switch (s) {
        case "pending":
        case "creating":
        case "deleting":
          return "pending";
        case "ready":
        case "created":
          return "ready";
        case "failed":
          return "error";
        default:
          return "info";
      }

    // Flows as raw string.
    case "build":
      switch (s) {
        case "pending":
          return "pending";
        case "success":
          return "ready";
        case "failed":
          return "error";
        case "cancelled":
          return "neutral";
        default:
          return "info";
      }

    case "preview":
      switch (s) {
        case "provisioning":
        case "deploying":
        case "deleting":
          return "pending";
        case "ready":
          return "ready";
        case "failed":
          return "error";
        default:
          return "info";
      }

    // Legacy variantFromState behavior + the failure-detail enums
    // (openapi StackResourceFailure / ContainerFailureDetail).
    case "generic":
      switch (s) {
        case "ready":
        case "running":
        case "active":
        case "succeeded":
        case "exposed":
        case "released":
          return "ready";
        case "pending":
        case "deploying":
        case "creating":
        case "updating":
        case "provisioning":
        case "inprogress":
          return "pending";
        case "error":
        case "failed":
        case "crash":
        case "crashloopbackoff":
        case "unhealthy":
        case "runtime_crash":
        case "readiness_failure":
        case "build_failure":
        case "crash_loop":
        case "out_of_memory":
        case "image_pull_failed":
        case "create_container_error":
        case "exit_error":
        case "port_not_listening":
          return "error";
        case "superseded":
        case "cancelled":
          return "neutral";
        default:
          return "info";
      }
  }
}
