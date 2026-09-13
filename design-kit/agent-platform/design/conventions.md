# Stackdome design system — conventions

Stackdome is a self-hosted PaaS: stacks of services deployed onto Kubernetes
clusters. The UI is a dense, desktop-only control surface, not a marketing site.
These components are the shipped product's own React components, exported from
the app; the previews here render the same code the product runs.

Reuse a component before writing one. If nothing fits, compose the primitives —
do not restyle a primitive to make it fit.

## Surfaces

White floats, grey recedes. The page ground is a warm off-white; anything the
user acts on (sheet, card, drawer, dialog, menu) is white and carries a shadow.
Content inside a floating surface is flat — it gets no shadow of its own.

Grounds are solid; marks (dividers, washes, hover states, selection) are alpha
tints of the ink, never a picked grey. Every divider is `subtle`; a line that
draws a shape is `border`.

## Type — named by job, anchored on 13px

Use the token, never `text-sm` or `text-[13px]`.

| Token | Size / line | Job |
|---|---|---|
| `text-column` | 11.5 / 16 | The floor. Column labels |
| `text-meta` | 12 / 16 | Row data — branch, counts, status, timestamps |
| `text-body` | 13 / 20 | The base. Nav, buttons, breadcrumbs, prose, inputs |
| `text-name` | 14 / 20 | The thing you scan a list for — a row's own name |
| `text-title` | 16 / 24 | A page's section titles, a card's own name |
| `text-head` | 20 / 28 | Dialog and empty-state headlines |

Two weights only, 400 and 500. Every line-height is a multiple of 4.
`font-mono` follows the content (an id, a host, a command), never the column.

## Geometry

Control heights are 28 / 32 / 40. **32 is the default and that includes every
form field** — inputs, selects, switch rows, drawer and dialog footers, sidebar
rows. 28 is for chips and in-row actions. 40 is rare: one major control that
owns its surface. Height follows density, never importance — an important
button gets filled, not taller.

Radius is a function of height, so anything the same height takes the same
radius: `rounded-sm` 6px chips and badges, `rounded-md` 8px list rows, menu
items, nav items and inputs, `rounded-lg` 12px cards and panels, `rounded-xl`
16px modals, dialogs and sheets.

Fields sit on a two-column grid and fill their cell. Never write "(optional)" —
the required `*` says it by not being there. A placeholder shows a specimen,
never the label again.

## Colour and state

Three text tiers, one job each: the name, its data, and its supporting meta.
A state colour is one hue on a three-rung ladder — a status is never a fourth
grey. Selection and focus are the same blue; the focus ring is a 1.5px shadow,
not elevation, and a Radix surface takes a shadow ring rather than an outline.

A glyph earns its place only by making a distinction the word cannot. A chevron
pair picks a value; a single chevron opens what is under it.

## Lists

Space, not lines, and never a card per row. A list row is a `RecordRow`-shaped
grid of fixed tracks — name, then meta tracks, then actions — so rows in the
same list align down the page. Status text lives in its own track.

## Overlays and destructive actions

Drawers and dialogs come from the primitives (`Drawer`, `Dialog`), and the
header is `SheetHeader` — title, subtitle, actions on the right. Destructive
actions escalate with the blast radius: an in-row `Delete` for a reversible
thing; `DangerZone` at the foot of a drawer for a resource; `ConfirmProvider`
for anything that destroys data, with three levels — confirm, acknowledge
(a checkbox) and retype (the resource's own name).

Never inline an `AlertDialog`. Route every confirmation through the
`ConfirmProvider` service — it keeps one modal transition per tick and avoids
the Radix pointer-events wedge.

## Shell

Desktop only. At ≥ 1280 the sidebar is expanded at 240px; between 1024 and 1280
it collapses to a 56px rail, and the toggle in the title row makes that manual
at any width. Below 1024 is out of scope. The sheet fills the remainder with a
12px inset.

## Data in these previews

The product fetches over REST and streams over SSE. The previews here run with
no network: stories whose only content came from a mocked fetch or event stream
are omitted, so a streaming component (logs, metrics, the release timeline)
shows its disconnected or empty state. That is the preview's limit, not the
component's — every such component takes its data as props and renders live in
the product.

## Writing code against this system

- Light mode is the target here. Dark exists but is not the inverse — its
  alphas are their own set.
- Never hand-roll a copy of a component. Update the primitive instead.
- No raw hex, no off-scale type, no `text-[13px]`. Tokens or nothing.
- Comments state a constraint the code cannot; they are never history.
