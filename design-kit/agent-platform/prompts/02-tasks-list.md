# 02 Tasks list

Route `/tasks`. The home page for a developer. Answers one question: which tasks need me, and what did the agent deliver.

## Goal
A list where the "Needs you" rows are impossible to miss, "Ready for review" rows lead to a PR, and running rows show where the agent is without nine-phase noise.

## Data on screen (per row)
- Report description, truncated to one line (the task's title; a task without a report shows "Change request" plus the first message).
- Application name.
- Coarse status via `StatusText`: Running (with current phase as the meta line: "Reproducing", "Run 2 of 2: deploying"), Needs you, Ready for review, Failed. Cancelled as muted text.
- Runs used: "Run 1 of 2".
- Resolution once terminal: Fix verified, Fix unverified, Not reproduced, No change needed, Abandoned.
- Pull request chip: repo short name plus number, draft state as a hollow chip.
- Stack: a small link glyph when a stack is ready, with expiry as meta ("expires in 3d").
- Source glyph: web, Slack, Sentry, Jam, harness (only web is live at MVP; others render the same glyph slot).
- Relative time: created, or completed when terminal.

## Layout
- Sheet header: title "Tasks", primary action "New task" (opens prompt 04's drawer). Toolbar row: search, status filter as a `SegmentedControl` (All, Needs you, Running, Ready for review, Failed), application filter as a `Select`.
- §11 list: 64px rows, name column capped, status column pinned, one column takes the slack.
- Needs you rows carry a left-edge accent in the "needs you" colour and sort to the top by default. Their second line is the agent's blocking question, truncated.
- Row click goes to `/tasks/:id`. No row-level overflow menu at MVP except Cancel on running tasks.

## States (one artboard each)
1. Populated: 8 rows covering every coarse status, at least one Needs you at the top, one Ready for review with a merged PR, one Failed after run limit.
2. Empty, no tasks ever: `EmptyState` with a one-line explanation and "New task" as the action. If there are no applications, the action instead says "Connect an application first" and links to `/applications`.
3. Filtered to Needs you, one result.
4. Filtered with zero results (the filter empty state, distinct from state 2).
5. Loading skeleton, 5 rows.

## Reuse
- `Branded/RecordRow`, `Branded/StatusText`, `Branded/SearchField`, `Primitives/SegmentedControl`, `Primitives/Select`, `Branded/EmptyState`, `Primitives/Badge` for the PR chip.
- Look at the stacks list for the row and header rhythm: `frontend/src/pages/stacks/components/list/stack-row.tsx` and its story `Pages/Stacks`.

## Rules
- §11: status is `StatusText` in a row, never a pill. Space, not lines, between rows.
- One colour carries "Needs you" everywhere: this row accent, the sidebar badge, the Task detail banner.
- No card per row.

## Out of scope
Bulk actions, grouping by application, Slack or Sentry as live sources.
