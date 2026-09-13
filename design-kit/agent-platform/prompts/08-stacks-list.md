# 08 Stacks list

Route `/stacks`. Every running copy across the org. Also rendered inside an Application's Stacks tab, filtered.

## Goal
See what is running, why it exists (purpose), who or what owns it, when it goes away, and get to its URL or its canvas in one click.

## Data on screen (per row)
- Name: application name plus a short identifier (e.g. "Acme Shop · task 4f2a"), URL as a second mono line.
- Purpose: task, preview, load test, scratch, persistent, as a small chip.
- Status via `StatusText`: Provisioning (spinner), Ready, Degraded, Expired, Torn down.
- Owner: the task (link, with its coarse status) or the user who spun it up.
- Latest release: short SHA, ref, release status (queued, building, live, failed).
- Expires: relative ("in 71h", "no expiry" for persistent), turns to the warning tier under 6h.
- Created.

## Layout
- Sheet header: title "Stacks", primary "Spin up stack" (prompt 10). Toolbar: search, application `Select`, purpose `SegmentedControl` (All, Task, Preview, Scratch, Persistent, Load test), status filter, `ViewToggle` list/cards.
- List: §11 rows. Cards: the existing `StackCard` with purpose chip and expiry in the meta line.
- Row click opens `/stacks/:id` (prompt 09). URL is its own link target, opens in a new tab.
- Torn down stacks are hidden by default; a toolbar toggle "Show torn down" reveals them muted.

## States (one artboard each)
1. Populated, 7 rows: 3 task stacks (one provisioning, one ready, one expired), 1 preview, 1 scratch owned by a user, 1 persistent, 1 degraded.
2. Empty: `EmptyState` "No stacks running", body: stacks appear when a task prepares one or when you spin one up; action "Spin up stack". If no applications, the action becomes "Connect an application".
3. Card view of state 1.
4. Filtered to purpose task inside an Application's Stacks tab (no application filter shown).

## Reuse
- `Branded/RecordRow`, `Branded/StatusText`, `Features/StackCard`, `Branded/EntityCard/EndpointPills` for the URL, `Branded/ViewToggle`, `Primitives/SegmentedControl`, `Branded/EmptyState`.
- Existing stacks list is the base: `frontend/src/pages/stacks/components/list/`, stories `Pages/Stacks`, `Features/StackCard`.
- The settled column layout from `DESIGN-PRODUCT.md` §11 ("Settled 23 August 2026, on the stacks table"): name 300 with one fact, source 260 mono.

## Rules
- §11: one fact per cell; the name does not also carry status or purpose.
- Status is `StatusText`; purpose is a chip because it is a category, not a state.
- One moving thing: the provisioning spinner.

## Out of scope
Creating a stack from a template or blank (the old New stack journey), cluster selection, addons.
