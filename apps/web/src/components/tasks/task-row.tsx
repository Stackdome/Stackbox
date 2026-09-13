import { CoarseStatus, ReportSource } from "@stackbox/contract";
import { Bug, FlaskConical, Globe, MessageSquare, Video, X, type LucideIcon } from "lucide-react";
import type { Task } from "@/api/mappers/task";
import {
  DataListActions,
  DataListCell,
  DataListName,
  DataListRow,
  StatusText,
  absoluteAge,
  relativeAge,
} from "@/components/branded";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const TASK_COLUMNS =
  "grid-cols-[16px_minmax(240px,420px)_160px_minmax(120px,1fr)_88px_120px_72px_32px]";

const SOURCE_GLYPH: Record<ReportSource, LucideIcon> = {
  [ReportSource.Web]: Globe,
  [ReportSource.Slack]: MessageSquare,
  [ReportSource.Sentry]: Bug,
  [ReportSource.Jam]: Video,
  [ReportSource.Harness]: FlaskConical,
};

export function TaskRow({
  task,
  onOpen,
  onCancel,
}: {
  task: Task;
  onOpen: (task: Task) => void;
  onCancel: (task: Task) => void;
}) {
  const Source = task.source ? SOURCE_GLYPH[task.source] : null;
  const statusLine = task.phaseLine ?? task.resolutionLabel;

  return (
    <DataListRow
      columns={TASK_COLUMNS}
      label={task.title}
      onActivate={() => onOpen(task)}
      data-status={task.status}
      // Inset, so the accent takes no width from the grid.
      className={cn(task.status === CoarseStatus.NeedsYou && "shadow-[inset_2px_0_0_var(--warn)]")}
    >
      <div className="flex text-fg-muted">
        {Source && <Source role="img" aria-label={task.sourceLabel ?? undefined} className="size-4" />}
      </div>
      <DataListName name={task.title} secondary={task.blockingQuestion ?? undefined} mono={false} />
      <div className="flex min-w-0 flex-col">
        <StatusText domain="task" state={task.status} />
        {statusLine && <span className="truncate text-meta text-fg-muted">{statusLine}</span>}
      </div>
      <DataListCell>{task.application.name}</DataListCell>
      <DataListCell numeric>{task.runLabel}</DataListCell>
      <div className="min-w-0">
        {task.pullRequest && (
          <Badge variant={task.pullRequest.isDraft ? "secondary" : "default"}>{task.pullRequest.label}</Badge>
        )}
      </div>
      <DataListCell numeric title={absoluteAge(task.at) ?? undefined}>
        {relativeAge(task.at)}
      </DataListCell>
      <DataListActions>
        {task.cancellable && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Cancel ${task.title}`}
            onClick={(event) => {
              event.stopPropagation();
              onCancel(task);
            }}
            // The row answers Enter by opening the task.
            onKeyDown={(event) => event.stopPropagation()}
          >
            <X />
          </Button>
        )}
      </DataListActions>
    </DataListRow>
  );
}
