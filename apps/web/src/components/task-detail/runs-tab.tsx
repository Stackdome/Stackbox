import { RunOutcome } from "@stackbox/contract";
import type { RunView } from "@/api/mappers/task-detail";
import { EmptyState, RailNode, TimelineNode, TimelineRail, type RailDotShape, type TimelineTone } from "@/components/branded";

const MARK: Record<RunOutcome, { tone: TimelineTone; shape: RailDotShape }> = {
  [RunOutcome.Running]: { tone: "amber", shape: "ring" },
  [RunOutcome.Passed]: { tone: "ok", shape: "solid" },
  [RunOutcome.Failed]: { tone: "err", shape: "ring" },
  [RunOutcome.Abandoned]: { tone: "muted", shape: "ring" },
};

export function RunsTab({ runs }: { runs: RunView[] }) {
  if (runs.length === 0) return <EmptyState title="No runs yet" description="A run starts once the report is reproduced." />;
  return (
    <TimelineRail>
      {runs.map((run, index) => {
        const mark = MARK[run.outcome];
        const shas = [run.candidateSha && `candidate ${run.candidateSha}`, run.verifiedSha && `verified ${run.verifiedSha}`, run.costLabel].filter(Boolean).join(" · ");
        return (
          <RailNode key={run.id} tone={mark.tone} shape={mark.shape} isLast={index === runs.length - 1}>
            <TimelineNode identity={run.title} title={run.outcomeLabel} state={{ word: run.outcomeLabel, tone: mark.tone }} detail={shas}>
              {run.failedCheck && <p className="text-meta text-danger">{run.failedCheck.line}</p>}
            </TimelineNode>
          </RailNode>
        );
      })}
    </TimelineRail>
  );
}
