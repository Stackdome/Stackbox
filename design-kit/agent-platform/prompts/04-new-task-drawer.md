# 04 New task drawer

Opens from Tasks list "New task" and from an Application's Tasks tab. A form drawer (§13, width form 560). The user leaves to grab a screenshot and comes back, so it is a drawer, not a dialog.

## Goal
Capture a report the agent can act on: what happened, what should have happened, a screenshot, and which application it is against. Three fields and a picker. Nothing else.

## Data on screen
- Application picker (`Select`, preselected when opened from an application page).
- Description (textarea, required).
- Expected behaviour (textarea, optional but nudged).
- Screenshot upload (drop zone, image only, preview thumbnail after upload, remove control).
- Reporter shown read-only as the current user.
- Advanced disclosure: target branch (defaults to the application's Stackfile repo default branch), run limit (default 2).

## Layout
- Drawer header: "New task". Body: `FormSection` blocks. Footer: Cancel, "Start task" primary.
- Field order: Application, Description, Expected behaviour, Screenshot, Advanced.
- After submit the drawer closes and the new row appears at the top of Tasks in phase intake.

## States (one artboard each)
1. Blank, opened from Tasks list, application unselected.
2. Filled with a screenshot preview, opened from an application (picker locked with the app name).
3. Validation: description empty, submit attempted, `FieldError` under description.
4. No applications exist: body replaced with an inline blocked state, "Connect an application first" linking to `/applications`, footer has only Close. Use `BlockedAction` (`frontend/src/components/branded/blocked-action.tsx`).
5. Advanced expanded.

## Reuse
- `Primitives/Drawer`, `Branded/FormSection`, `Branded/FieldShell`, `Branded/FieldError`, `Primitives/Select`, `Branded/Disclosure` (`frontend/src/components/branded/disclosure.tsx`).
- Drawer chrome and footer rhythm from `Features/Stacks/NewStackDrawer` and `Features/Addons/AddonDrawer`.

## Rules
- §13 form width 560. Drawer footer holds exactly Cancel and the primary.
- §8 body/footer rhythm.
- No wizard steps; this is one page of fields.

## Out of scope
Sentry, Jam, Slack intake. Attaching more than screenshots. Picking a specific stack (the task prepares its own).
