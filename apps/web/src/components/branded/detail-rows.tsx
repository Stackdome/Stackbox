import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A read-only object, as one idiom top to bottom: a label and its value on
 * the 32 rung, in groups separated by space.
 *
 * | | |
 * |---|---|
 * | Row | **32 fixed**, gap 16 |
 * | Label | 120 fixed, `body` in `fg-muted` |
 * | Value | fills, `body` in ink |
 * | Row to row | **flush**, one pitch, all the way down |
 *
 * **The rung is not decoration.** A value can carry a control, such as a
 * `Copy` or a link, and a row that sizes to its text puts a 32px button in a
 * 20px row and drags every row around it out of rhythm. Fixed at 32, a row
 * with a button and a row with a word are the same height and the column
 * reads as one list.
 *
 * ### One pitch, no groups
 *
 * Order carries the meaning instead: the rows are arranged from what changes
 * most to what changes least, and that reads on its own, at one pitch,
 * without the air announcing it.
 */
export function DetailList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={cn("flex flex-col", className)}>{children}</dl>;
}

export function DetailRow({
  label,
  title,
  children,
}: {
  label: string;
  /** The exact value, where the row shows a rounded one, such as an age over
   *  its timestamp. Defaults to a plain string child, so a truncated value
   *  stays recoverable. */
  title?: string;
  children?: ReactNode;
}) {
  // An absent fact is not a row with a dash in it: the group closes up.
  if (children === undefined || children === null || children === "")
    return null;
  return (
    <div className="flex h-8 items-center gap-4">
      <dt className="w-[120px] flex-none text-body text-fg-muted">{label}</dt>
      <dd
        className="flex min-w-0 flex-1 items-center gap-2 text-body text-foreground"
        title={title ?? (typeof children === "string" ? children : undefined)}
      >
        {/* A plain value truncates; a composed one truncates itself.
            The row is fixed at 32, so a value that wraps does not make the
            row taller: it escapes it, and the next row's label lands beside
            the overflow. Measured on a 62-character branch name.

            `truncate` cannot go on the `dd`: it is a flex container, and
            `text-overflow` applies to the box that holds the text. So a bare
            string gets a box of its own, and anything richer carries its own
            rule, since only the call site knows which part of it may shrink. */}
        {typeof children === "string" || typeof children === "number" ? (
          <span className="min-w-0 truncate">{children}</span>
        ) : (
          children
        )}
      </dd>
    </div>
  );
}
