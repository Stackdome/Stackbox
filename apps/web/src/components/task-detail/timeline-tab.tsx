import type { TimelineEntry } from "@/api/mappers/task-detail";
import { EmptyState, RailNode, TimelineNode, TimelineRail } from "@/components/branded";

const clock = (at: string) => new Date(at).toLocaleTimeString([], { hour12: false });

export function TimelineTab({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) return <EmptyState title="Nothing has happened yet" description="Events appear here as the agent works." />;
  return (
    <TimelineRail>
      {entries.map((entry, index) => (
        <RailNode key={entry.id} tone={entry.failed ? "err" : "muted"} shape={entry.failed ? "ring" : "solid"} isLast={index === entries.length - 1}>
          <TimelineNode title={entry.title} time={clock(entry.at)} />
        </RailNode>
      ))}
    </TimelineRail>
  );
}
