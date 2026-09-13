# Stackdome agent platform: screen prompts for Claude Design

Paste this preamble first, then one screen prompt per design session. Each screen prompt is self-contained apart from this file.

## What Stackdome is now

An ephemeral application delivery platform for agents and humans. A customer connects an application (one or more Git repositories plus a Stackfile). Anyone, person or agent, can bring up an isolated running copy of the whole application. The headline workflow: someone reports a problem, Stackdome brings the application up, an agent reproduces the failure, fixes it, redeploys, verifies against the running app, and hands back a pull request with evidence. Stackdome never touches production.

Two compute systems stay separate on every screen:
- **Stack**: the customer's application running for real, with a URL.
- **Sandbox**: where the agent reads and edits code and drives browser tests against the stack.

"The stack is healthy" and "the fix works" are two different facts. Never merge them into one status.

## Vocabulary (use these exact words in all copy)

| Word | Meaning |
|---|---|
| Organization | The customer account. Owns applications and repositories. |
| Repository | A connected Git repo, org-level, may feed several applications. Provider is GitHub or GitLab. |
| Application | A customer's system as a whole. Has a Stackfile pointer, services, credentials refs. |
| Service | One runnable component (web, api, worker, postgres). Bound to a repository plus path, or to a stock image. |
| Stack | A running copy of an application with a URL. |
| Purpose | Why a stack exists: task, preview, load test, scratch, persistent. |
| Release | One version deployed into a stack. URL does not change between releases. |
| Report | Problem-shaped intake: description, expected behaviour, reporter, screenshot. |
| Task | A unit of agent work with an outcome someone cares about. |
| Phase | Where a running task is: intake, preparing, reproducing, implementing, deploying, verifying, hand over, needs input, failed, cancelled. |
| Resolution | How a task ended: fix verified, fix unverified, not reproduced, no change needed, abandoned. Empty while running. |
| Run | One coding attempt inside a task, bounded by a run limit (default 2). |
| Check | An assertion that was tested. Three kinds: stack ready, report reproduced, fix verified. Outcome: passed, failed, inconclusive. "Passed" always means the assertion held. |
| Artifact | Screenshot, HAR, test log, recording. Attached to a report, a check, or a message. |
| Pull request | One output of a task. A fix across two repos gives two PRs. Can be draft. State: open, merged, closed. |

Banned words on screen: **Environment**, **Deployment**, **Job**, **Workflow**, **Attempt**, **Preview environment**. Say Stack, Release, Task, Run, "stack with purpose preview".

Coarse task status for lists (never show nine phases in a pill): **Running**, **Needs you**, **Ready for review**, **Failed**. Cancelled shows as muted text "Cancelled".

## Information architecture

Sidebar (paper frame, two groups, first group has no label):
- Tasks (badge = count of tasks in Needs you)
- Applications
- Stacks
- Organization group: Repositories, Settings

Hierarchy the screens follow: Repository → Application (services bound to repos) → Stack (purpose) → Release. Task hangs off an Application and pins one Stack once prepared.

Routes: `/tasks`, `/tasks/:id`, `/applications`, `/applications/:slug` (tabs), `/stacks`, `/stacks/:id` (canvas view), `/repositories`, `/settings/*`.

## Design rules that bind

The design system is the Stackdome Storybook bundle already synced to this project. Read `design/DESIGN-PRODUCT.md` in this kit before drawing anything. The full component map with paths is `design/components-map.md`; which repo behaviour is dropped is `context/reference-code-status.md`. The sections that bind hardest for these screens:

- §3 Surfaces: white sheet on a paper frame. Grey never means "a card". Grey wells only for input and reference.
- §11 Lists: 64px rows, space not lines, no card per row. Status in a row is `StatusText`, never `StatusPill`. A page capped at one entry gets a row and no column header.
- §12 / §12a Shell and sheet header: title row (collapse toggle, page title, actions) plus an optional toolbar row (search, filters, view toggle). No divider under the header.
- §13 Overlays: drawer first, dialog second. Drawer when the user leaves and comes back. Dialog widths: ask 440, form 560, work 760. Anything wider is a page.
- §16 Deploy timeline: rail with solid (landed), hollow ring (never finished), spinner (in flight). Reuse this rail for task timelines and release lists.
- §7 Colour: three text tiers. One moving thing per screen.
- §10 Destructive actions escalate with blast radius.

Do not invent new primitives. If a screen needs a component that is not in the list below, say so in a note on the artboard rather than drawing a one-off.

## Components to reuse (story titles in the synced design system, plus repo path)

Shell
- `Features/AppSidebar` (`frontend/src/components/app-sidebar.tsx`, items from `nav-items.ts`)
- `Branded/SheetHeader` (`frontend/src/components/sheet-header.tsx`), `Primitives/PageTitle`
- `Primitives/Sidebar`, `Features/ThemeToggle`

Lists and cards
- `Branded/RecordRow`, `Branded/StatusText`, `Branded/StatusPill`, `Branded/EmptyState`, `Branded/SearchField`, `Branded/ViewToggle`, `Primitives/Table`, `Primitives/Badge`
- `Features/StackCard` (exposed as `DeployStackCard`), `Branded/EntityCard/EndpointPills`
- `Features/Previews/RepositoryRail` and `RepositoryContextLine` (repo-scoped list pattern, `frontend/src/pages/previews/components/`)

Timelines, evidence, steps
- `Features/Deployments/TimelineRail`, `TimelineNode`, `StageTracker`, `EventRow`, `FailureCard`, `SplitConsole`, `BuildLogsModal`, `ConfigDiff`, `DeployFailedBanner` (`frontend/src/pages/stacks/components/editor/tabs/deployments/`)
- `Branded/AlertBanner`, `Branded/DeploySparkline`

Git
- `Features/GitProviders/ConnectProviderDrawer`, `RepoCombobox`, `GitSourcePicker` (`frontend/src/components/git-source-picker/`)
- `Features/GitIntegrations/IntegrationRow`, `GitIntegrationDrawer` (`frontend/src/pages/git-integrations/`)
- `Features/Previews/EnableRepoWizard`, `RepositorySettingsDrawer`
- Provider logos: `frontend/src/components/branded/provider-logo.tsx`

Canvas
- `Features/Canvas/CanvasEditor`, `ResourceNode`, `ResourceDrawer`, `ConnectionEdge`, `NodeGlyph`, `AttachmentNode`, `CanvasControls`, `LiveViewToggle` (`frontend/src/pages/stacks/components/editor/tabs/architecture/`)
- `Features/EditorChrome/CanvasEditorShell`, `DeployPill`, `PublicEndpointRow`, `ValidationBanner`, `AutosaveStatus`

Forms and overlays
- `Primitives/Drawer`, `Primitives/Dialog`, `Primitives/Tabs`, `Primitives/SegmentedControl`, `Primitives/Command`, `Primitives/Select`, `Primitives/MultiSelect`
- `Branded/FormSection`, `Branded/FieldShell`, `Branded/DangerZone`, `Branded/ConfirmDialog` (exposed as `ConfirmProvider`), `Branded/PickerRow`

## How each screen prompt is written

Every screen prompt has the same sections: Goal, Data on screen, Layout, States (each state is one artboard), Reuse, Rules, Out of scope. What must be functional in the prototype is in `prompts/11-interaction-contract.md`. Design every listed state. Desktop only, 1440 wide. Every state ships in both themes: one light artboard and one dark artboard, side by side, same data. Dark uses the `.dark` tokens in `design/tokens.css`; never hand-pick dark colours.
