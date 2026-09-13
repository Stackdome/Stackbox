# 10 Spin up stack drawer

Opens from Stacks list, an Application's header, and the expired-stack banner. Form drawer (§13, 560). A human-owned stack with no task.

## Goal
Bring up a running copy of an application in four fields: which application, why, which ref, how long it lives.

## Data on screen
- Application `Select` (locked when opened from an application).
- Purpose: `SegmentedControl` with Scratch, Preview, Load test, Persistent. Task is not offered (tasks create their own).
- Ref: branch or tag from the application's Stackfile repository, `BranchField` pattern, defaults to the default branch. If the application spans several repositories, one branch field per repository, each defaulting to that repo's default branch.
- Expiry: presets 24h, 72h, 7d, No expiry. Persistent defaults to No expiry; others default to 72h.
- Name: optional label, defaults to the ref.

## Layout
- Drawer header "Spin up stack". `FormSection` per group. Footer: Cancel, "Spin up" primary.
- On submit the drawer closes and the user lands on `/stacks/:id` in the provisioning state (prompt 09, state 5).

## States (one artboard each)
1. Blank from the Stacks list.
2. Filled, opened from an application with two repositories (two branch fields).
3. Load test purpose selected with 24h expiry and a note that load test stacks get the same resources as any other stack at MVP.
4. No applications: blocked state, "Connect an application first".

## Reuse
- `Primitives/Drawer`, `Branded/FormSection`, `Branded/FieldShell`, `Primitives/SegmentedControl`, `Primitives/Select`, `frontend/src/components/git-source-picker/branch-field.tsx`, `Branded/BlockedAction`.
- `Features/Stacks/NewStackDrawer` for drawer chrome; `Features/Previews/NewPreviewEnvDrawer` for the ref plus expiry rhythm.

## Rules
- §13 form width 560. §8 body/footer rhythm.
- No cluster, region, or size fields.

## Out of scope
Cloning another stack's data, choosing a specific release, scheduling teardown by PR merge (that is the task path).
