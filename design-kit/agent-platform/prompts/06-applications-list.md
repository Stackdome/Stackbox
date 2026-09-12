# 06 Applications list

Route `/applications`. The org's connected systems. The first page a new organization has to act on.

## Goal
One card or row per application with enough to jump to the right place: services and their repos, live stacks, active tasks, sync health of the Stackfile.

## Data on screen (per application)
- Name, slug.
- Services: count and names ("web, api, worker, postgres"), with a glyph per service kind.
- Repositories: full names feeding this application (1 to n).
- Stackfile: repo plus path, synced-at SHA short, validated time, or "Not synced" / "Validation failed".
- Stacks: count by purpose (e.g. "2 task, 1 persistent").
- Tasks: count running, count needs you.

## Layout
- Sheet header: title "Applications", primary "Connect application" (opens the onboarding in prompt 07, step 1). Toolbar: search, `ViewToggle` list/cards.
- List view: §11 rows. Name, Services, Repositories (mono), Stackfile sync as `StatusText`, Stacks, Tasks.
- Card view: `EntityCard` sized like the stacks grid; card body shows the service names as glyph chips and the repos line; card footer shows stacks and tasks counts.
- Row/card click goes to `/applications/:slug`.

## States (one artboard each)
1. Empty: `EmptyState`, headline "Connect your first application", body explains repositories plus Stackfile become an application, action "Connect application". If no repositories exist yet, a second line links to Repositories first.
2. Populated list, three applications: one healthy, one "Not synced", one "Validation failed".
3. Populated cards, same data.
4. Search with no result.

## Reuse
- `Branded/RecordRow`, `Branded/EntityCard`, `Branded/ViewToggle`, `Branded/StatusText`, `Branded/EmptyState`, `Features/Wizard/BlockGlyph` for service kind glyphs.
- The stacks list is the reference for the list/card toggle: `frontend/src/pages/stacks/components/list/index.tsx`, `stack-card.tsx`, story `Pages/Stacks`.

## Rules
- §11 lists. §3 cards are white on the frame, no grey cards.
- Status as `StatusText` in rows; on cards a `StatusText` in the meta line, still not a pill.

## Out of scope
Archiving applications, per-application permissions.
