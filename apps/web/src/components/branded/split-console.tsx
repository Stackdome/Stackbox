import { useState } from "react";
import { cn } from "@/lib/utils";
import { TONE_DOT, TONE_TEXT, type TimelineTone } from "./timeline-rail";

export interface ConsoleSource {
  id: string;
  label: string;
  state?: { word: string; tone: TimelineTone };
}

export interface ConsoleLine {
  id: string;
  message: string;
  at?: string | null;
  tone?: TimelineTone;
  sourceId?: string;
}

export interface SplitConsoleProps {
  sources: ConsoleSource[];
  lines: ConsoleLine[];
  sourcesTitle?: string;
  allLabel?: string;
  streaming?: boolean;
}

/**
 * A 256px pane of sources beside the activity they wrote. The time column is 72
 * wide so a 12-hour locale's `5:28:12 PM` stays on one line. With no sources the
 * activity takes the whole width.
 */
export function SplitConsole({ sources, lines, sourcesTitle = "Sources", allLabel = "everything", streaming = false }: SplitConsoleProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedSource = sources.find((source) => source.id === selected);
  const visible = selectedSource ? lines.filter((line) => line.sourceId === selectedSource.id) : lines;

  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-card">
      <div className="flex items-stretch">
        {sources.length > 0 && (
          <div className="w-64 flex-none border-r border-border-subtle px-2.5 pt-3 pb-3.5">
            <div className="flex items-baseline px-2 pb-2.5">
              <span className="text-meta text-fg-muted">{sourcesTitle}</span>
              <span className="ml-auto text-meta text-fg-2">{sources.length}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-[7px] text-left",
                selectedSource ? "hover:bg-[var(--wash-hover)]" : "bg-[var(--wash-selected)]",
              )}
            >
              <span className="h-2 w-2 flex-none rounded-full border-[1.5px] border-fg-muted" />
              <span className="whitespace-nowrap text-meta text-fg-2">{allLabel}</span>
              <span className="ml-auto text-meta text-fg-muted">{lines.length}</span>
            </button>
            {sources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => setSelected(source.id)}
                className={cn(
                  "mt-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-[7px] text-left",
                  selected === source.id ? "bg-[var(--wash-selected)]" : "hover:bg-[var(--wash-hover)]",
                )}
              >
                <span className={cn("h-2 w-2 flex-none rounded-full", TONE_DOT[source.state?.tone ?? "muted"])} />
                <span className="min-w-0 truncate text-meta font-medium text-foreground">{source.label}</span>
                {source.state && <span className={cn("ml-auto flex-none text-meta", TONE_TEXT[source.state.tone])}>{source.state.word}</span>}
              </button>
            ))}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
            <span className="text-meta text-fg-muted">Activity</span>
            {sources.length > 0 && <span className="whitespace-nowrap text-meta text-fg-2">· {selectedSource ? selectedSource.label : allLabel}</span>}
            {streaming && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-meta text-success">
                <span className="h-2 w-2 rounded-full bg-success" /> live
              </span>
            )}
          </div>
          <div className="py-1.5">
            {visible.length === 0 && <div className="px-4 py-2 text-meta text-fg-muted">No activity yet</div>}
            {visible.map((line) => (
              <div key={line.id} className="flex items-start gap-2.5 px-4 py-[5px] hover:bg-[var(--wash-hover)]">
                {line.at !== undefined && (
                  <span className="w-[72px] flex-none pt-0.5 text-column tabular-nums text-fg-muted">{line.at}</span>
                )}
                {line.tone && (
                  <span className="flex w-3 flex-none justify-center pt-[7px]">
                    <span className={cn("h-2 w-2 rounded-full", TONE_DOT[line.tone])} />
                  </span>
                )}
                <span className="min-w-0 flex-1 font-mono text-meta leading-[1.45] break-words whitespace-pre-wrap text-fg-2">{line.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
