import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TONE_TEXT, type TimelineTone } from "./timeline-rail";

export interface TimelineNodeProps {
  title: ReactNode;
  identity?: ReactNode;
  time?: string | null;
  state?: { word: string; tone: TimelineTone };
  detail?: ReactNode;
  open?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
}

/**
 * Two lines grouped by axis (§16): identity, title and time on the first; the
 * state word and the detail that explains it on the second, indented under the
 * title. A row with a body leads with the disclosure.
 */
export function TimelineNode({ title, identity, time, state, detail, open = false, onToggle, children }: TimelineNodeProps) {
  const firstLine = (
    <>
      {onToggle && (
        <ChevronDown
          aria-hidden="true"
          className={cn("h-3.5 w-3.5 flex-none translate-y-[2px] text-fg-muted transition-transform", !open && "-rotate-90")}
        />
      )}
      {identity && <span className="flex-none text-body font-medium text-foreground">{identity}</span>}
      <span className="min-w-0 truncate text-body font-medium text-foreground">{title}</span>
      {time && <span className="flex-none text-column tabular-nums text-fg-muted">{time}</span>}
    </>
  );
  const secondLine = (state || detail) && (
    <div className={cn("mt-[3px] flex items-center gap-1.5 text-column", onToggle && "pl-6")}>
      {state && <span className={cn("flex-none", TONE_TEXT[state.tone])}>{state.word}</span>}
      {detail && <span className="min-w-0 truncate text-fg-muted">{state ? "· " : ""}{detail}</span>}
    </div>
  );

  return (
    <div>
      {onToggle ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="-mx-2 flex min-h-8 w-[calc(100%+16px)] flex-col items-stretch rounded-md px-2 py-1.5 text-left hover:bg-[var(--wash-hover)] focus-ring-edge"
        >
          <span className="flex items-center gap-2.5">{firstLine}</span>
          {secondLine}
        </button>
      ) : (
        <div className="flex min-h-8 flex-col justify-center py-1.5">
          <div className="flex items-center gap-2.5">{firstLine}</div>
          {secondLine}
        </div>
      )}
      {onToggle && open && children && <div className="mt-1.5 mb-1 max-w-[900px] pl-6">{children}</div>}
      {!onToggle && children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}
