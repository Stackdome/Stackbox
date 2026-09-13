import * as React from "react"
import { ChevronsUpDownIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

/**
 * **A field that holds several answers instead of one.**
 *
 * There is exactly one in the product: `Depends on`, in the resource drawer,
 * and until now it was the only control in that drawer that had never been on
 * the system. It arrived as a vendored shadcn block and kept everything that
 * came with it: a bouncing-badge animation driven by a wand icon in the corner,
 * four colour variants nobody used, a `(Select All)` row, a `Clear ǀ Close`
 * footer, hand-mixed `bg-secondary` colours, hand-set `mx-2` / `mx-3` spacing,
 * a hand-rolled checkbox made of a bordered `div`, and a resting height of 40
 * on a form where every other control is 32.
 *
 * It is rebuilt here out of the primitives that already existed:
 * `Popover`, `Command`, `Checkbox`, `Badge`, and it now says the same things a
 * `Select` says, because to a reader it IS a select that takes more than one
 * answer.
 *
 * ### The trigger is a Select's trigger
 *
 * Same material, same rungs, same marks: the sheet ground with `elevation/sm`
 * and a hairline, hover and open lifting the LINE rather than the fill, 32 at
 * radius 8, and `ChevronsUpDown` at the trailing edge: the pair of glyphs that
 * says *this cycles between values*, which is what this does.
 *
 * The inset is 8 for a placeholder and **6 once a chip is in it**: see the
 * trigger below. That is an optical correction, not a second rule.
 *
 * A control that opens a listbox must not look like a different kind of object
 * depending on how many answers it accepts. Two of these sat 16px apart in the
 * same form and did not match.
 *
 * ### It grows, and the resting height is what makes that legible
 *
 * A control holding a variable number of things has to be allowed to wrap. That
 * growth only reads as growth if the empty state sits on the same rung as its
 * neighbours: at a resting 40 it just looked like the odd one out.
 *
 * ### The rows are checkboxes, because they are checkboxes
 *
 * Each row was a 16px `div` with `border-primary` and an opacity trick standing
 * in for a tick. The `Checkbox` primitive is the same 16px box, already carries
 * focus, disabled and indeterminate, and (being an `input`) is what a screen
 * reader announces as checkable. The row is the target; the box reports.
 *
 * ### What was removed, and why
 *
 * | Gone | |
 * |---|---|
 * | `animation` + the wand | A corner icon that made the chips bounce. Demo furniture |
 * | `variant`: secondary / destructive / inverted | One chip exists. Three unused colourways is three ways to drift |
 * | `(Select All)` | A row that looks like an option and is not one. On `Depends on` it means "depend on everything", which is never the answer |
 * | `Clear ǀ Close` footer | `Close` repeats Esc and click-away; `Clear` already lives on the trigger, next to the chips it clears |
 * | `modalPopover`, `asChild` | Never passed |
 */

export interface MultiSelectOption {
  label: string
  value: string
  /** A 16px glyph before the label: for options whose kind is not in the word. */
  icon?: React.ComponentType<{ className?: string }>
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  /** Controlled from the outside on every change; the component holds no truth. */
  onValueChange: (value: string[]) => void
  defaultValue?: string[]
  placeholder?: string
  /**
   * How many chips to draw before the rest collapse to `+N`.
   *
   * **It is a display cap, not a selection cap:** the collapsed ones are still
   * selected, and clearing the count clears only them.
   */
  maxCount?: number
  /**
   * Above this many options the popover grows a search box. Below it, a search
   * box is a control you have to skip past to reach a list you can already see
   * all of.
   */
  searchThreshold?: number
  /** Says the field is in an invalid state: takes the danger line, as `Select` does. */
  "aria-invalid"?: boolean
  disabled?: boolean
  className?: string
  id?: string
}

export function MultiSelect({
  options,
  onValueChange,
  defaultValue = [],
  placeholder = "Select options",
  maxCount = 3,
  searchThreshold = 7,
  disabled,
  className,
  id,
  ...props
}: MultiSelectProps) {
  const [selected, setSelected] = React.useState<string[]>(defaultValue)
  const [open, setOpen] = React.useState(false)

  // `defaultValue` is the caller's value on every render: the form owns the
  // truth and this mirrors it, so an external discard (the drawer's reset
  // arrow) has to land here too. Keyed on content, not identity: the caller
  // rebuilds the array each render.
  const defaultKey = defaultValue.join(" ")
  React.useEffect(() => {
    setSelected(defaultValue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultKey])

  const commit = (next: string[]) => {
    setSelected(next)
    onValueChange(next)
  }

  const toggle = (value: string) =>
    commit(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])

  const shown = selected.slice(0, maxCount)
  const overflow = selected.length - shown.length
  const byValue = React.useMemo(() => new Map(options.map((o) => [o.value, o])), [options])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-slot="multi-select-trigger"
          {...props}
          className={cn(
            // **`Select`'s material, verbatim.** A raised card: the sheet
            // ground, a hairline, `elevation/sm`. Hover and open firm the LINE;
            // the fill never moves.
            "bg-card shadow-sm [outline-width:1px] [outline-style:solid] [outline-color:var(--border)]",
            "hover:[outline-color:var(--border-strong)] data-[state=open]:[outline-color:var(--border-strong)]",
            "aria-invalid:[outline-color:var(--danger)]",
            "transition-[color,box-shadow,background-color,border-color] focus-ring-edge",
            // 32 at radius 8: the rung every control in a form sits on.
            // `min-h` rather than `h`, because chips wrap.
            "flex min-h-8 w-full items-center gap-1.5 rounded-md py-1 text-left",
            // **8 of inset for a placeholder, 6 for a chip: and that is not an
            // inconsistency, it is the correction that makes them look equal.**
            //
            // Text meets the edge with almost no air; a chip brings its own,
            // because it is a bordered box whose glyph sits 8 inside a stroke.
            // Measured at a flat 8 the chips read as sitting further in than the
            // placeholder they replace, and the field's left edge appeared to
            // move when you picked something. Same rule the Button already
            // follows: its icon side is trimmed 3 against its label side.
            selected.length === 0 ? "px-2" : "pl-1.5 pr-2",
            "text-body font-normal",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:[outline-color:var(--border)]",
            "[&_svg]:pointer-events-none [&_svg]:shrink-0",
            className,
          )}
        >
          {/* **The chips space themselves with a gap:** each one used to carry
              `m-1`, which put 4px above and below the line and pushed a 22px
              chip to a 30px row, the whole reason the control rested at 40.

              **6 across, 4 down, and the two numbers are doing different jobs.**
              Across, 6 is the gap that separates two things on one line, the
              same 6 the field puts between its own parts. Down, a wrapped chip
              is the SAME list continuing, so it closes to 4: a second row that
              breathed as much as the gap between neighbours would read as a
              second group. */}
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
            {selected.length === 0 ? (
              // The placeholder tier a `Select` uses. §7 gives `fg-muted` to
              // every placeholder in the product.
              <span className="text-fg-muted">{placeholder}</span>
            ) : (
              <>
                {shown.map((value) => {
                  const option = byValue.get(value)
                  const Icon = option?.icon
                  return (
                    <Badge
                      key={value}
                      variant="secondary"
                      // **Radius 4, not the pill.** `Badge` is a pill by
                      // default and that is right for a status word standing on
                      // its own; a chip inside a field is a value in a box, and
                      // a row of pills in a rounded rectangle read as lozenges
                      // floating in a tray rather than as the field's contents.
                      //
                      // `xs` is the rung below `sm`: §2 makes radius a
                      // function of HEIGHT, and at 22 tall a chip sits one step
                      // under the 28/6 control. The ladder had no entry there
                      // until this component needed one.
                      // **A filled token, with no line: and the fill is the
                      // segmented control's `--well`.**
                      // It was `secondary`, a hairline outline over the field's
                      // own white, so two chips inside a bordered field drew
                      // three concentric edges in 12px of space. The fill says
                      // "a value lives here" without spending a line to do it.
                      //
                      // It was then `--background`, the frame colour: a SOLID,
                      // which only works on a surface that happens to sit above
                      // it. `--well` is an alpha tint, so it takes the tone of
                      // whatever the field is standing on and one value holds
                      // everywhere: the same argument the segmented control's
                      // track makes, and now the same paint.
                      //
                      // The word is `body/400` in ink, not `meta/500` in fg-2:
                      // a chosen dependency is the field's VALUE, and every
                      // other value in the form is 13/400 ink. At 12/500 it was
                      // simultaneously the smallest and boldest thing in the row.
                      // **22 tall, and the line-height is what holds it there.** `body` carries
                      // a 20px leading, which with 3 of padding either side makes 26,
                      // and §2 hangs radius off HEIGHT, so `rounded-xs` (4) was added
                      // to the ladder for a 22px chip specifically. Drawn at 26 it
                      // reports a rung it is not on. `leading-4` gives the 13px word
                      // its own 16 and the box lands on 22.
                      className="h-[22px] max-w-full gap-1 rounded-xs border-transparent bg-[var(--well)] py-[3px] pl-2 pr-1 text-body font-normal leading-4 text-foreground"
                    >
                      {Icon && <Icon className="size-3" />}
                      <span className="truncate">{option?.label ?? value}</span>
                      {/* **The ✕ is a real button inside the chip.** It was a
                          bare `<svg onClick>`, not focusable, not announced,
                          and not removable from the keyboard at all. */}
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label={`Remove ${option?.label ?? value}`}
                        className="focus-ring-edge -mr-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-foreground/10 hover:text-foreground"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggle(value)
                        }}
                      >
                        <XIcon className="size-3" />
                      </span>
                    </Badge>
                  )
                })}
                {overflow > 0 && (
                  // Not removable, and it does not pretend to be: it is a count
                  // of things you cannot see, so a ✕ on it would delete a
                  // selection the reader was never shown.
                  <Badge variant="secondary" className="rounded-xs text-fg-muted">
                    +{overflow}
                  </Badge>
                )}
              </>
            )}
          </span>

          {/* **Clear, then the chevrons: and clear is only there when there is
              something to clear.** It used to draw a ✕, a vertical rule and the
              chevrons at all times, so an empty field carried two controls that
              did nothing. */}
          {selected.length > 0 && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear all"
              className="focus-ring-edge flex size-5 shrink-0 items-center justify-center rounded-sm text-fg-muted transition-colors hover:bg-foreground/10 hover:text-foreground"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                commit([])
              }}
            >
              <XIcon className="size-3.5" />
            </span>
          )}
          {/* The same pair of glyphs a `Select` wears, at the same size and
              tier. A single chevron says *this unfolds*; a pair says *this
              cycles between values*. */}
          <ChevronsUpDownIcon className="size-3.5 shrink-0 text-fg-2" />
        </button>
      </PopoverTrigger>

      {/* **As wide as the field it belongs to.** It was `w-auto`, so the menu
          sized to its longest option and stood proud of the control that opened
          it. `p-0` because `Command` pays its own inset.

          **`overflow-hidden` is what makes the corners round.** `Command` sets
          its own `rounded-md` and clips to it, so an 8px-cornered white box sat
          inside a 12px-cornered bordered one and its square shoulders poked
          through the outer curve. Clipping at the popover puts every corner on
          the outer radius, whatever is nested inside.

          **`hideWhenDetached`: the menu goes when the field goes.** The drawer
          body scrolls, and a popover anchored to a control that has scrolled
          out of the viewport otherwise stays put, floating over unrelated
          content with nothing under it to explain what it belongs to.

          `collisionPadding` keeps it off the sheet's edges when it flips. */}
      <PopoverContent
        align="start"
        sideOffset={4}
        collisionPadding={8}
        hideWhenDetached
        className="w-(--radix-popover-trigger-width) overflow-hidden p-0"
        onOpenAutoFocus={(e) => {
          // With no search box there is nothing that wants the caret, and
          // focusing the list's first row on open reads as a pre-made choice.
          if (options.length <= searchThreshold) e.preventDefault()
        }}
      >
        <Command>
          {options.length > searchThreshold && <CommandInput placeholder="Search" />}
          <CommandList>
            <CommandEmpty>Nothing matches that.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value)
                const Icon = option.icon
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggle(option.value)}
                    className="cursor-pointer gap-2"
                  >
                    {/* `pointer-events-none` so the row owns the click. A
                        checkbox that also handles it fires the toggle twice
                        and the option flickers back to where it started. */}
                    <Checkbox checked={isSelected} className="pointer-events-none" tabIndex={-1} />
                    {Icon && <Icon className="size-4 text-fg-muted" />}
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
