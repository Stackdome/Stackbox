import type { ArtifactView, CheckView } from "@/api/mappers/task-detail";
import { EmptyState, RailNode, TimelineNode, TimelineRail } from "@/components/branded";
import { ArtifactStrip } from "./artifact-strip";

const clock = (at: string) => new Date(at).toLocaleTimeString([], { hour12: false });

function groupTitle(runNumber: number | null): string {
  return runNumber === null ? "Before run 1" : `Run ${runNumber}`;
}

export function ChecksTab({
  checks,
  pendingCheck,
  onOpenArtifact,
}: {
  checks: CheckView[];
  pendingCheck: string | null;
  onOpenArtifact: (artifact: ArtifactView) => void;
}) {
  if (checks.length === 0 && !pendingCheck) return <EmptyState title="No checks yet" description="The instance and the report are checked before any run starts." />;
  const groups = [...new Set(checks.map((check) => check.runNumber))].sort((a, b) => (a ?? 0) - (b ?? 0));
  return (
    <div className="flex flex-col gap-6">
      {groups.map((runNumber) => {
        const inGroup = checks.filter((check) => check.runNumber === runNumber);
        return (
          <section key={groupTitle(runNumber)} aria-label={groupTitle(runNumber)}>
            <h3 className="mb-1 text-meta text-fg-muted">{groupTitle(runNumber)}</h3>
            <TimelineRail>
              {inGroup.map((check, index) => (
                <RailNode key={check.id} tone={check.passed ? "ok" : "err"} shape={check.passed ? "solid" : "ring"} isLast={index === inGroup.length - 1}>
                  <TimelineNode title={check.line} time={clock(check.at)} detail={check.shortSha ?? undefined}>
                    <ArtifactStrip artifacts={check.artifacts} onOpen={onOpenArtifact} />
                  </TimelineNode>
                </RailNode>
              ))}
            </TimelineRail>
          </section>
        );
      })}
      {pendingCheck && (
        <TimelineRail>
          <RailNode tone="amber" shape="ring" isLast>
            <TimelineNode title={pendingCheck} state={{ word: "In flight", tone: "amber" }} />
          </RailNode>
        </TimelineRail>
      )}
    </div>
  );
}
