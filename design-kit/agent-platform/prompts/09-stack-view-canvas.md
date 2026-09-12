# 09 Stack view: canvas, rail, and chat

Route `/stacks/:id`. The existing full-bleed canvas editor, read-only for topology. You cannot add or remove services here; the Stackfile owns the shape. You can open a service and configure it, watch releases, and talk to the agent about this stack.

## Goal
Three things on one screen: what is running (canvas), how it got here and where it is going (right rail: status, URL, releases, linked tasks), and a way to ask for a change (chat that opens or continues a Task on this stack).

## Data on screen
- Header: application name, stack identifier, purpose chip, `StatusPill` (allowed here, page headline), URL as `PublicEndpointRow`, expiry, actions: Extend expiry, Tear down (destructive).
- Canvas: one `ResourceNode` per service, edges from the topology, `NodeGlyph` by kind, `LiveViewToggle` on by default (live status per node). No Add resource popover, no context-menu add, no drag-to-connect. `CanvasControls` keep zoom and fit only.
- Node drawer (`ResourceDrawer`): tabs Configuration, Variables, Runtime (rename the existing Configuration, Environment, Deployment tabs; the old names are banned words). Configuration loses image/source change and delete; variable edits and replica/resource edits stay and create a new Release on apply.
- Right rail (320): Status block, Releases (rail of releases, newest first, each with SHA, ref, status, time; a release opened by a task run says "Run 2"), Linked tasks (every task whose stack is this one: coarse status, description, link), Owner.
- Chat panel (docked right of the rail or replacing it via a toggle, 400 wide): thread of task messages for the active task on this stack. Composer at the bottom with attach screenshot. A blocking agent question renders as a highlighted message with the reply focused. A mini phase line above the composer ("Implementing · run 1 of 2"). "New conversation" starts a new Task against this stack's application with this stack pinned.

## Layout
- Reuse `CanvasEditorShell`: top bar, canvas, inspector host. Replace the editor's Deploy pill with the stack `StatusPill` and the `PublicEndpointRow`.
- Right side is a two-mode column: Rail mode (status, releases, linked tasks) and Chat mode. A `SegmentedControl` at the top of the column switches ("Details" / "Chat"); an unanswered blocking question forces a badge on "Chat".
- Node drawer opens over the canvas as today, from the inspector host.
- Zen mode (existing) hides the column and the top bar; the chat badge survives as a floating dot.

## States (one artboard each)
1. Ready, details mode: 4 nodes live, 3 releases (baseline, run 1 failed, run 2 live), 1 linked task ready for review.
2. Chat mode, agent asking a blocking question, reply box focused, mini phase line "Needs input".
3. Chat mode, agent working: last message is a progress note with a spinner, composer disabled with "The agent is working" hint, phase line "Verifying · run 2 of 2".
4. Chat mode, new conversation on a scratch stack with no task yet: empty thread, one-line hint of what to ask, composer focused.
5. Provisioning: nodes rendered as skeleton outlines, status pill spinner, releases rail with one "building" node, chat disabled until ready.
6. Degraded: one node in the warning tier, `AlertBanner` under the header naming the service, releases unchanged.
7. Expired: canvas dimmed, banner "This stack expired 2h ago", actions become "Spin up again" and "Tear down". Chat read-only.
8. Node drawer open, Variables tab, one edited value marked dirty, footer "Apply" that promises a new release.

## Reuse
- `Features/Canvas/CanvasEditor`, `ResourceNode`, `ResourceDrawer`, `ConnectionEdge`, `NodeGlyph`, `LiveViewToggle`, `CanvasControls`.
- `Features/EditorChrome/CanvasEditorShell`, `PublicEndpointRow`, `ValidationBanner`, `ViewChangesModal` (for the apply summary).
- `Features/Deployments/TimelineRail`, `TimelineNode`, `ReleaseMenu` for the releases rail.
- `Branded/StatusPill`, `Branded/AlertBanner`, `Branded/DangerZone` pattern for tear down (confirm dialog, ask width).
- Files: `frontend/src/pages/stacks/components/editor/` (shell, `tabs/architecture/`, `tabs/deployments/timeline/`). Story `Features/Canvas/CanvasEditor` and `Features/EditorChrome/CanvasEditorShell`.
- The chat thread rows are new. Build them from `EventRow` and the `SplitConsole` rhythm; do not draw a generic chat bubble. Agent messages are left-aligned rows with a role glyph; user replies the same, no bubbles, no avatars.

## Rules
- Topology is read-only: no add, delete, or reconnect affordances anywhere, including the context menu.
- §16 marks on the releases rail.
- §13: tear down is a confirm dialog at ask width; extending expiry is a popover with three presets.
- One moving thing: the agent spinner in chat, or the provisioning spinner, never both visible.
- Chat is a Task. Every thread maps to one task; the linked tasks list is the archive of threads.

## Out of scope
Multi-task chat tabs, logs and metrics tabs (keep the existing entry points but do not redesign them), editing the Stackfile from the drawer.
