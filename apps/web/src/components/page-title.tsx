import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * **The page's own name, wherever it is drawn: one rung, one definition.**
 *
 * The title is a `<span>` when it is fixed, a `<button>` when it can be
 * renamed, and an `<input>` while it is being renamed. All three share one
 * rung, so `pageTitleClass` is the export: `PageTitle` is the plain case built
 * on it, and `RenameableTitle` composes it into its own elements. Two places
 * drawing the same slot at their own size is exactly what has to stay
 * impossible.
 *
 * **14/20 at weight 500.** It is a label, not a headline: the sidebar already
 * says which section you are in and the trail already says how you got here,
 * so the title does not need to announce it a third time.
 */
export const pageTitleClass = "text-name font-medium text-foreground";

/**
 * The fixed page title's rung. `SheetHeader` wraps it in the page's only
 * `<h1>`; a page that renders its own title would give the page two.
 */
export function PageTitle({
  children,
  className,
  ...props
}: React.ComponentProps<"span"> & { children: ReactNode }) {
  return (
    <span
      data-slot="page-title"
      // A hard ceiling in characters, with an ellipsis under it: the title is
      // whatever the object is called, and `min-w-0` lets the row give way to
      // the actions rather than crushing them when the band is tight.
      className={cn(pageTitleClass, "block min-w-0 max-w-[32ch] truncate", className)}
      {...props}
    >
      {children}
    </span>
  );
}
