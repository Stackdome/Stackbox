import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TimelineTone = "ok" | "amber" | "err" | "muted";
export type RailDotShape = "solid" | "ring" | "spinner";

export const TONE_TEXT: Record<TimelineTone, string> = {
  ok: "text-success",
  amber: "text-warn",
  err: "text-danger",
  muted: "text-fg-muted",
};

export const TONE_DOT: Record<TimelineTone, string> = {
  ok: "bg-success",
  amber: "bg-warn",
  err: "bg-danger",
  muted: "bg-fg-muted",
};

export function TimelineRail({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="list" className={className}>
      {children}
    </div>
  );
}

/**
 * The dot centres on the first line's cap height: a row's first line is 32px,
 * so an 8px dot starts at 20 and the 14px spinner at 17. The 12px gutter lands
 * the rail on the sheet header's leading button. The connector is nudged half
 * a pixel so a 1px rule renders on one device pixel.
 */
export function RailNode({
  tone,
  shape = "solid",
  isLast = false,
  id,
  children,
}: {
  tone: TimelineTone;
  shape?: RailDotShape;
  isLast?: boolean;
  id?: string;
  children: ReactNode;
}) {
  const dot =
    shape === "spinner" ? (
      <Loader2 data-testid="rail-dot" className={cn("mt-[17px] h-3.5 w-3.5 flex-none motion-safe:animate-spin", TONE_TEXT[tone])} />
    ) : shape === "ring" ? (
      <span data-testid="rail-dot" className={cn("mt-5 h-2 w-2 flex-none rounded-full border-[1.5px] border-current bg-background", TONE_TEXT[tone])} />
    ) : (
      <span data-testid="rail-dot" className={cn("mt-5 h-2 w-2 flex-none rounded-full", TONE_DOT[tone])} />
    );

  return (
    <div id={id} role="listitem" data-shape={shape} className="flex scroll-mt-24 items-stretch gap-3">
      <div className="flex w-3 flex-none flex-col items-center">
        {dot}
        <span
          data-testid="rail-connector"
          className={cn("mt-1 w-px flex-1 translate-x-[0.5px] bg-border", isLast ? "invisible min-h-0" : "visible min-h-4")}
        />
      </div>
      <div className={cn("min-w-0 flex-1", isLast ? "pb-1" : "pb-8")}>{children}</div>
    </div>
  );
}
