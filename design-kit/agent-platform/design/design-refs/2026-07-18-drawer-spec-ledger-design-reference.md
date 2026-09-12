# Design reference — Resource drawer "Functional spec ledger" (3a)

Source: Claude Design project `a7c29dd1-ff98-4eb6-9b46-3490d665854a`, file `Form Density Variants.dc.html`, variant **3a — Functional spec ledger** (user-selected direction; supersedes 2a/2b explorations in same file).
Local extraction: `~/.claude/jobs/32fb092c/tmp/3a-section.html` (variant markup), `design-full.html` (whole file).

## Intent (from design file narrative)

- "The 2b ledger applied to all three tabs, now working: tabs switch, every field edits, ports and variables add/remove, the public toggle flips, paste-.env parses. Sections got bigger foldable headers on hairline rules — click a title to collapse it. Mounts moved to last."
- Ledger = label-left rows on hairlines — "scans like an engineering spec sheet". Related fields share a row, hints shrink to one line, advanced fields fold away, brand finish: hairlines, mono section markers, 2–4px radii, amber only where earned.
- User scope: apply to drawer **Configuration** and **Deployment** tabs (Environment excluded for now).

## Component inventory (3a variant)

| Piece | Design spec |
|---|---|
| Section header (foldable) | `<details>`/`<summary>` row: mono 11px uppercase label, letter-spacing 1.4px, fg-muted; hairline rule fills middle (`0.5px` border color); optional right meta in mono 10.5px (#475569); chevron 15px rotates 180° on open; padding `22px 6px 12px`; hover bg #0d1219 |
| Ledger row `.lr` | flex row, gap 16px, padding `13px 6px`, bottom hairline `#161c26`, hover bg `#0d1219`. Label col fixed **150px**, 13px, fg2 (#cbd5e1); control `flex:1`; optional right mono hint 10.5px (#475569) |
| Input `.fld` compact | height 36px, 13.5px (12.5px mono for code-ish), border 0.5px #1f2937, radius 4px, bg #0a0e14; focus: brand border + 3px brand ring @ .18; error border #d9223e |
| Select `.selx` | native select, 36px, radius 4px, custom chevron bg-image, fg2 text |
| Segmented `.seg` | bordered 4px-radius box, 2 cells split by hairline; active cell: brand text on brand-bg (.08) |
| Port row | label ("Primary"/…), port input 84px mono, protocol select 92px (HTTP/TCP/UDP), right: pub label mono 11px + 38×21px pill toggle (knob 17px, bg brand when on), remove `.xbtn` (fg-muted → danger on hover) |
| add-port chip `.editchip` | mono 12px, bordered 6px-radius chip "+ add port" |
| Mounts row | volume icon + name (fg2), path in mono code chip (bg #161c26, radius 3px), right mono hint "drag a volume onto the node to attach", external-link glyph |
| Deployment sections | PRE-DEPLOYMENT STEP (meta: "runs before the main container"): Init command + Init arguments; MAIN CONTAINER STEP: Command + Arguments. Field hints below input, 12px fg-muted |
| Footer | unchanged: View logs left, Remove resource right (danger) |

Section order (Configuration): GENERAL → SOURCE → PORTS → **MOUNTS last**.
SOURCE right-meta reflects mode ("git repository" / "container image"); PORTS meta "N exposed"; MOUNTS meta "N volume(s) · managed on canvas".
SOURCE contains "Build from" segmented control; git mode shows Repository (mono, error state), Revision select, and a nested foldable "Advanced" (Push registry + hint). Image mode shows "Image reference" mono input.

## Token mapping (design hex → live `frontend/src/index.css`)

| Design hex | Live token | Status |
|---|---|---|
| #0a0e14 | `--background` | match |
| #11161e | `--card` | match |
| #161c26 | `--secondary` / `--popover` | match |
| #0d1219 hover | between bg and card — use `muted/40` or `accent/50` | approx |
| #1f2937 | `--border` | match |
| #334155 | `--border-strong` | match |
| #cbd5e1 | `--fg-2` | match |
| #94a3b8 | `--muted-foreground` | match |
| #64748b | `--fg-muted` | match |
| #475569 | no token — use `fg-muted` at reduced opacity (`text-fg-muted/70`) | drift, do not hardcode |
| #f97316 | `--brand` / `--primary` | match |
| rgba(249,115,22,.08/.10/.18) | `--brand-bg`, ring via `--ring` | match |
| #d9223e | `--danger` / `--destructive` | match |
| Geist / Geist Mono | `--font-sans` / `--font-mono` | match |

Rule: implement with Tailwind token classes (`border-border`, `text-fg-2`, `bg-secondary`, `text-brand`…), zero raw hex.

## Acceptance criteria (from design's functional claims)

1. Configuration/Deployment/Environment tabs still switch; Environment untouched by this pass.
2. Every section header toggles collapse; chevron rotates; state per-section.
3. All fields remain editable and wired to existing autosave/dirty logic (no behavior change — layout/skin only).
4. Ports: add/remove rows, protocol select, public toggle flips.
5. Mounts render last; read-only row with canvas hint.
6. No raw hex; tokens + existing `branded/`/`ui/` primitives only, per brand memory.
7. Existing tests updated, gates green.

## Source-file map

| Bundle path | Defines |
|---|---|
| `Form Density Variants.dc.html` lines ~57–211 | 3a variant markup (authoritative) |
| same file `<style>` head | `.lr .fld .selx .seg .srow .chev .editchip .dashbtn .xbtn .revealbtn .gbtn` class specs |
| `_ds/...019dea2a.../colors_and_type.css` | design-time token copy (reconciled above) |
| `StackShell.dc.html` | drawer shell frame (header/tabs/footer — already matches live) |
