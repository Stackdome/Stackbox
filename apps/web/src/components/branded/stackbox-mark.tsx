import { Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

/** Stackbox brand mark: the `Boxes` glyph beside the wordmark. */
export function StackboxMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <Boxes size={size} aria-hidden />
      <span className="text-name font-medium">Stackbox</span>
    </span>
  );
}
