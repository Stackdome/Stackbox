import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { type InstanceDetailView, expiryLabel } from "@/api/mappers/instance";
import { DetailList, DetailRow, StatusText, absoluteAge, relativeAge } from "@/components/branded";
import { applicationPath, taskPath } from "@/lib/routes";

function FactsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="text-name font-medium text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function OwnerFact({ detail }: { detail: InstanceDetailView }) {
  const { owner } = detail;
  if (owner === null) return <p className="text-body text-fg-muted">No owner</p>;
  if (owner.kind === "user") return <p className="text-body text-fg-2">Spun up by {owner.name}</p>;
  return (
    <p className="flex min-w-0 items-center gap-2 text-body">
      <Link to={taskPath(owner.taskId)} className="truncate text-foreground underline-offset-2 hover:underline">
        {owner.description}
      </Link>
      <StatusText domain="task" state={owner.coarseStatus} size="body" />
    </p>
  );
}

export function InstanceFacts({ detail, now }: { detail: InstanceDetailView; now: number }) {
  return (
    <aside className="flex flex-col gap-8">
      <FactsSection title="Status">
        <DetailList>
          <DetailRow label="Status">
            <StatusText domain="instance" state={detail.status} size="body" />
          </DetailRow>
          <DetailRow label="Purpose">{detail.purposeLabel}</DetailRow>
          <DetailRow label="Expires">{expiryLabel(detail.expiresAt, now).text}</DetailRow>
          <DetailRow label="Created" title={absoluteAge(detail.createdAt) ?? undefined}>
            {relativeAge(detail.createdAt) ?? undefined}
          </DetailRow>
        </DetailList>
      </FactsSection>
      <FactsSection title="Owner">
        <OwnerFact detail={detail} />
      </FactsSection>
      <FactsSection title="Application">
        <DetailList>
          <DetailRow label="Name">
            <Link to={applicationPath(detail.application.id)} className="truncate text-foreground underline-offset-2 hover:underline">
              {detail.application.name}
            </Link>
          </DetailRow>
          <DetailRow label="Repository">{detail.repository.fullName}</DetailRow>
        </DetailList>
      </FactsSection>
    </aside>
  );
}
