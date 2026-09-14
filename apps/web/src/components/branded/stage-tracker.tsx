import { cn } from "@/lib/utils";

export type StageStatus = "done" | "active" | "paused" | "failed" | "todo" | "skipped";

export interface Stage {
  key: string;
  label: string;
  status: StageStatus;
}

/**
 * The mark is the deploy timeline rail's 8px dot. `paused` is a hollow warn
 * ring: the step is where the work stopped, waiting on someone, and it has not
 * finished. `skipped` stays hollow muted, inert rather than pending.
 */
const DOT: Record<Exclude<StageStatus, "active">, string> = {
  done: "bg-success",
  failed: "bg-danger",
  todo: "bg-fg-muted",
  skipped: "border-[1.5px] border-fg-muted",
  paused: "border-[1.5px] border-warn",
};

function Mark({ status }: { status: StageStatus }) {
  if (status === "active") {
    return <span className="h-2 w-2 flex-none rounded-full border-[1.5px] border-warn border-t-transparent motion-safe:animate-spin" />;
  }
  return <span className={cn("box-border h-2 w-2 flex-none rounded-full", DOT[status])} />;
}

export function StageTracker({ stages, className }: { stages: Stage[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-y-2", className)} role="list">
      {stages.map((stage, i) => (
        <div key={stage.key} className="flex items-center" data-status={stage.status}>
          <div className="flex items-center gap-1.5" role="listitem" aria-current={stage.status === "active" || stage.status === "paused" ? "step" : undefined}>
            <Mark status={stage.status} />
            <span
              className={cn(
                "font-sans text-meta font-medium",
                stage.status === "todo" || stage.status === "skipped" ? "text-fg-muted" : "text-foreground",
              )}
            >
              {stage.label}
            </span>
          </div>
          {i < stages.length - 1 && <span className="mx-[9px] h-[1.5px] w-5 flex-none bg-border" />}
        </div>
      ))}
    </div>
  );
}
