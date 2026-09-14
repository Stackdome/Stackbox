import type { InstancePurpose } from "@stackbox/contract";
import { Link } from "react-router-dom";
import { type InstanceOwnerView, PURPOSE_LABEL, type ReleaseView, expiryLabel } from "@/api/mappers/instance";
import { StatusText } from "@/components/branded";
import { Badge } from "@/components/ui/badge";
import { taskPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function PurposeChip({ purpose }: { purpose: InstancePurpose }) {
  return <Badge variant="secondary">{PURPOSE_LABEL[purpose]}</Badge>;
}

export function ExpiryText({ expiresAt, now }: { expiresAt: string | null; now: number }) {
  const expiry = expiryLabel(expiresAt, now);
  return (
    <span data-slot="expiry-text" className={cn("whitespace-nowrap text-meta", expiry.tone === "warning" ? "text-warn" : "text-fg-2")}>
      {expiry.text}
    </span>
  );
}

/** Its own link target: a click opens the instance in a new tab and never opens the row. */
export function InstanceUrlLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="truncate font-mono text-meta text-fg-muted underline-offset-2 hover:underline"
    >
      {url}
    </a>
  );
}

export function OwnerCell({ owner }: { owner: InstanceOwnerView }) {
  if (owner === null) return <span className="text-meta text-fg-muted">No owner</span>;
  if (owner.kind === "user") return <span className="truncate text-meta text-fg-2">{owner.name}</span>;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Link to={taskPath(owner.taskId)} onClick={(event) => event.stopPropagation()} className="truncate text-meta text-foreground underline-offset-2 hover:underline">
        {owner.description}
      </Link>
      <StatusText domain="task" state={owner.coarseStatus} />
    </span>
  );
}

export function LatestReleaseCell({ release }: { release: ReleaseView | null }) {
  if (release === null) return <span className="text-meta text-fg-muted">No release yet</span>;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate font-mono text-meta text-fg-2">{release.summary}</span>
      <StatusText domain="release" state={release.status} />
    </span>
  );
}
