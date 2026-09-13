# 07 Application detail and connect flow

Route `/applications/:slug`. Tabs: Overview, Services, Stacks, Tasks, Config. Also the "Connect application" onboarding, which is a page (§13: it has its own address and its own errors), at `/applications/new`.

## Goal
One place to see an application's shape (services, repos, Stackfile), everything running for it, and everything the agent is doing to it. The connect flow turns repositories plus a Stackfile into an application in three steps and lands on this page.

## Data on screen
- Header: name (renameable), slug, Stackfile sync as `StatusText`, actions: "Spin up stack" (prompt 10), "New task" (prompt 04).
- Overview: services as a compact topology strip (service glyphs with repo short names under them), live stacks (up to 5, purpose plus status plus URL), recent tasks (up to 5, coarse status), Stackfile card (repo, path, synced SHA, validated at, "Re-sync").
- Services tab: §11 rows. Name, Source (repo full name plus path in mono, or image ref for stock images), Kind glyph, Repository default branch. Rows are read-only: services are a projection of the Stackfile.
- Stacks tab: the Stacks list (prompt 08) filtered to this application, with the same columns.
- Tasks tab: the Tasks list (prompt 02) filtered to this application.
- Config tab: Stackfile repository and path (editable), credentials refs (name, kind, where it points; never the secret), danger zone: disconnect application.

## Layout
- Sheet header title row: name, `StatusText`, actions. Toolbar row: `Tabs`.
- Overview is a two-column grid: left 2/3 topology strip and stacks, right 1/3 tasks and Stackfile card.
- Connect flow page, three steps with `StageTracker` at the top:
  1. Repositories: pick one or more connected repositories (`MultiSelect` over the org's repositories, link to add more).
  2. Stackfile: pick which repository holds it and the path (default `stackfile.yaml`), or "Let the agent generate one" (creates an onboarding task, out of scope for now: show as disabled with a note).
  3. Sync: Stackdome reads the Stackfile, lists detected services with their source repo and path, flags a service whose repo is not connected, and asks for a name and slug. Finish lands on Overview.

## States (one artboard each)
1. Overview, healthy: 4 services across 2 repos, 2 live stacks, 3 recent tasks.
2. Overview, not synced: Stackfile card says "Not synced since a1b2c3d" with Re-sync; services list marked stale.
3. Overview, validation failed: `AlertBanner` under the header with the validation error and the offending path.
4. Services tab, populated, including a stock-image service with no repository.
5. Config tab with two credentials refs and the danger zone.
6. Connect flow step 1, two repos selected.
7. Connect flow step 3, one detected service points at an unconnected repository (inline warning with "Connect repository" link).
8. Connect flow step 3, success, services detected, name and slug filled.

## Reuse
- `Branded/SheetHeader`, `Branded/RenameableTitle`, `Primitives/Tabs`, `Branded/StatusText`, `Branded/AlertBanner`, `Branded/DangerZone`, `Branded/KeyValueRows`, `Branded/RecordRow`.
- `Features/Deployments/StageTracker` for the connect steps.
- `Features/Previews/EnableRepoWizard` (`frontend/src/pages/previews/components/enable-repo-wizard/`) is the closest existing multi-step flow; keep its rhythm, drop its footer Back pattern (see `docs/design/redesign-log.md`, "WizardFooter is deleted").
- `Primitives/MultiSelect`, `Features/GitProviders/RepoCombobox`.
- Create-stack page is the reference for a page-sized flow: `frontend/src/pages/stacks/components/create/`.

## Rules
- §13: the connect flow is a page, not a drawer.
- §10: disconnect application is the loudest destructive action in this product (stacks and tasks go with it); use the typed-confirm level.
- Services are read-only. No "add service" button anywhere; the Stackfile is the source.

## Out of scope
Stackfile editing in the browser, agent-generated Stackfile (onboarding task), per-service settings.
