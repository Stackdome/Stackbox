# 03 Task detail

Route `/tasks/:id`. The page a reviewer opens to decide whether to trust the agent's PR. Every claim on it is backed by a check and an artifact.

## Goal
Show where the task is (phase), what was proven (checks), what it cost in attempts (runs), and what it produced (PRs, stack URL). When the agent is blocked, the question and the reply box are the first thing on the page.

## Data on screen
- Header: report description as the title, application, coarse status, created and completed times, run count "Run 2 of 2".
- Report: description, expected behaviour, reporter, source, screenshot artifact(s).
- Phase stepper: intake → preparing → reproducing → implementing → deploying → verifying → hand over. Diversions (needs input, failed, cancelled) render as a state on the current step, not as steps.
- Timeline: task events in order, derived from the event log. Each event: kind, time, payload summary. Run boundaries and check results are events too.
- Checks: list of every check with kind, outcome, the release it tested (short SHA), the run it belongs to, time, artifacts (screenshot thumbnails, HAR, test log, recording).
- Runs: run number, candidate SHA, verified SHA (only on pass), outcome, started and ended, cost in cents summed from its executions.
- Stack: purpose task, status, URL, expiry, link to `/stacks/:id`.
- Pull requests: repo full name, number, head and base refs, draft flag, state. One row per PR.
- Messages: the conversation. Agent, user, system roles. A blocking message with no answer is highlighted.
- Resolution at the end: fix verified / fix unverified / not reproduced / no change needed / abandoned, with one sentence of what that means for the reviewer.

## Layout
- Two columns, 760 main and a 320 right rail, inside the sheet.
- Main: Needs-you banner (only when blocked) → phase stepper → tabs: Timeline, Checks, Runs, Conversation.
- Right rail: Stack card (status, URL, expiry), Pull requests, Report summary with screenshot, Resolution.
- Needs-you banner: the agent's question in full, a reply textarea, a Send button. Sending clears the banner and appends to Conversation.
- Checks tab: group by run (baseline checks first, "Before run 1"). Each check is a `TimelineNode` row: solid mark passed, hollow failed, spinner in flight; artifacts as a thumbnail strip under the row.
- Runs tab: one `TimelineRail` per task, each run a node with candidate SHA, outcome, cost; a failed run shows its failed check inline.

## States (one artboard each)
1. Running, reproducing: stepper at step 3, stack ready, no runs yet, one passed "stack ready" check, one in-flight "report reproduced".
2. Needs input: banner at top with the agent's question and reply box, stepper paused on implementing.
3. Ready for review, fix verified: stepper complete, two runs (run 1 failed verification, run 2 passed), PR non-draft open, resolution "Fix verified" with evidence thumbnails.
4. Ready for review, fix unverified: reproduction was inconclusive, PR open, resolution copy warns the reviewer that the change is unproven.
5. Failed after run limit: both runs failed, no PR promoted, resolution "Abandoned", stack still up with expiry.
6. Not reproduced: agent could not observe the bug, resolution "Not reproduced", reviewer asked to add detail (link back to the reply box).
7. Cancelled.

## Reuse
- `Features/Deployments/TimelineRail`, `TimelineNode`, `StageTracker`, `EventRow`, `FailureCard`, `SplitConsole` (for test log artifacts), `BuildLogsModal` pattern for opening a log.
- `Branded/AlertBanner` for the needs-you banner (variant info, width fits content per §16 note).
- `Branded/StatusPill` is allowed here (a detail page headline, not a row).
- `Primitives/Tabs`, `Branded/KeyValueRows` and `DetailRows` (`frontend/src/components/branded/`).
- Look at the stack editor Deployments tab for the rail: `frontend/src/pages/stacks/components/editor/tabs/deployments/deployments-tab.tsx`, story `Features/Deployments/DeploymentsTab`.

## Rules
- §16 marks: solid landed, hollow never finished, spinner in flight. Same marks for checks and runs.
- "Stack ready" and "fix verified" never collapse into one status.
- A check outcome word is always the assertion: "Reproduced: passed" means the bug was observed.
- One moving thing: the in-flight spinner. No progress bars.

## Out of scope
Editing the report, re-running a task, multi-repo PR sets beyond listing them, cost budgets.
