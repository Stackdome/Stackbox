import { detailRailClass } from "./layout";
import { CheckKind } from "@stackbox/contract";
import type { ArtifactView, CheckView, TaskDetailView } from "@/api/mappers/task-detail";
import { DetailList, DetailRow } from "@/components/branded";
import { ArtifactStrip } from "./artifact-strip";

function RailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="text-name font-medium text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function TaskRail({
  detail,
  checks,
  onOpenArtifact,
}: {
  detail: TaskDetailView;
  checks: CheckView[];
  onOpenArtifact: (artifact: ArtifactView) => void;
}) {
  const evidence = checks.filter((check) => check.kind === CheckKind.FixVerified && check.passed).flatMap((check) => check.artifacts);
  return (
    <aside className={`${detailRailClass} flex flex-col gap-8`}>
      <RailSection title="Application Instance">
        <p className="text-body text-fg-2">{detail.instanceLabel}</p>
      </RailSection>

      <RailSection title="Pull requests">
        {detail.pullRequests.length === 0 ? (
          <p className="text-body text-fg-muted">None opened yet</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {detail.pullRequests.map((pull) => (
              <li key={pull.key} className="flex flex-col">
                <a href={pull.href} target="_blank" rel="noreferrer" className="text-body font-medium text-foreground underline-offset-2 hover:underline">
                  {pull.label}
                </a>
                <span className="text-meta text-fg-muted">{[pull.stateLabel, pull.refs].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        )}
      </RailSection>

      {detail.report && (
        <RailSection title="Report">
          <DetailList>
            <DetailRow label="Reporter">{detail.report.reporter}</DetailRow>
            <DetailRow label="Source">{detail.report.sourceLabel}</DetailRow>
            <DetailRow label="Branch">{detail.targetBranch}</DetailRow>
          </DetailList>
          {detail.report.expectedBehaviour && <p className="text-body text-fg-2">Expected: {detail.report.expectedBehaviour}</p>}
          <ArtifactStrip artifacts={detail.report.screenshots} onOpen={onOpenArtifact} />
        </RailSection>
      )}

      {detail.resolution && (
        <RailSection title="Resolution">
          <p className="text-body font-medium text-foreground">{detail.resolution.label}</p>
          <p className="text-body text-fg-2">{detail.resolution.sentence}</p>
          <ArtifactStrip artifacts={evidence} onOpen={onOpenArtifact} />
        </RailSection>
      )}
    </aside>
  );
}
