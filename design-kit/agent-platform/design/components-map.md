# Components map

Story title as it appears in the synced design system ("Stackdome Bone"), repo path, and what it does on the agent platform screens. Titles under `Pages/*` are not synced; use the feature and branded components directly.

Renamed in the sync: `Features/StackCard` is `DeployStackCard`, `Branded/ConfirmDialog` is `ConfirmProvider`.

## Shell

| Story | Path | Use |
|---|---|---|
| Features/AppSidebar | `frontend/src/components/app-sidebar.tsx`, `nav-items.ts` | The sidebar. Items change per prompt 01. |
| Primitives/Sidebar | `frontend/src/components/ui/sidebar.tsx` | Rail, groups, collapse. |
| Branded/SheetHeader | `frontend/src/components/sheet-header.tsx` | Title row plus optional toolbar row on every page. |
| Primitives/PageTitle | `frontend/src/components/page-title.tsx` | Page title text. |
| Branded/RenameableTitle | `frontend/src/components/renameable-title.tsx` | Inline rename on Application detail. |
| Features/ThemeToggle | `frontend/src/components/theme-toggle.tsx` | Account block. |
| Primitives/Breadcrumb | `frontend/src/components/ui/breadcrumb.tsx` | Detail pages under a list. |

## Lists and cards

| Story | Path | Use |
|---|---|---|
| Branded/RecordRow | `frontend/src/components/branded/record-row.tsx` | The 64px list row. Tasks, Stacks, Repositories, Applications, Services. |
| Branded/StatusText | `branded/status-text.tsx` | Status inside a row. Never a pill in a row. |
| Branded/StatusPill | `branded/status-pill.tsx` | Status as a page headline (Task detail, Stack view). |
| Branded/StatusGlyph (no story) | `branded/status-glyph.ts` | Mark colours shared by text and pill. |
| Branded/EmptyState | `branded/empty-state.tsx` | Every empty and filter-empty state. Illustrations in `brand/empty-states/`. |
| Branded/SearchField | `branded/search-field.tsx` | Toolbar search. |
| Branded/ViewToggle | `branded/view-toggle.tsx` | List / cards. |
| Branded/EntityCard/EndpointPills | `branded/entity-card.tsx` | Card body and URL pills. |
| Features/StackCard (DeployStackCard) | `frontend/src/pages/stacks/components/list/stack-card.tsx` | Stack cards. |
| Branded/PickerRow | `branded/picker-row.tsx` | Selectable rows inside drawers (add repositories, pick repositories). |
| Branded/KeyValueRows, DetailRows (no story) | `branded/key-value-rows.tsx`, `detail-rows.tsx` | Right-rail facts on detail pages. |
| Branded/DataList (no story) | `branded/data-list.tsx` | Label and value pairs in cards. |
| Primitives/Table | `ui/table.tsx` | Only where a true table is needed. Lists prefer RecordRow. |
| Primitives/Badge | `ui/badge.tsx` | PR chip, purpose chip, sidebar count. |
| Features/Previews/RepositoryRail, RepositoryContextLine | `frontend/src/pages/previews/components/` | Pattern for repository-scoped grouping. |

## Timelines, steps, evidence

| Story | Path | Use |
|---|---|---|
| Features/Deployments/TimelineRail, TimelineNode, RailNode | `frontend/src/pages/stacks/components/editor/tabs/deployments/timeline/` | Task timeline, checks per run, releases on the stack view. Solid, hollow, spinner marks. |
| Features/Deployments/StageTracker | `branded/stage-tracker.tsx` | Phase stepper on Task detail, steps on the connect flow. |
| Branded/StageBadge (no story) | `branded/stage-badge.tsx` | One step's badge. |
| Features/Deployments/EventRow | `branded/event-row.tsx` | Timeline events and chat rows. |
| Features/Deployments/FailureCard | `branded/failure-card.tsx` | Failed check or failed run detail. |
| Features/Deployments/SplitConsole | `.../timeline/split-console.tsx` | Test log artifacts. |
| Features/Deployments/BuildLogsModal | `.../deployments/build-logs-modal.tsx` | Open a log in a work dialog. |
| Features/Deployments/ConfigDiff | `.../timeline/config-diff.tsx` | Variable change summary on a release. |
| Features/Deployments/DeployFailedBanner | `.../timeline/deploy-failed-banner.tsx` | Failed release headline. |
| Features/Deployments/ReleaseMenu | `.../timeline/release-menu.tsx` | Overflow on a release row. |
| Branded/AlertBanner | `branded/alert-banner.tsx` | Needs-you banner, validation failed, degraded, expired. |
| Branded/DeploySparkline | `branded/deploy-sparkline.tsx` | Optional on application cards. |
| Branded/LogSnapshot (no story) | `branded/log-snapshot.tsx` | Short log excerpt inline. |

## Git

| Story | Path | Use |
|---|---|---|
| Features/GitProviders/ConnectProviderDrawer | `frontend/src/components/git-source-picker/connect-provider-drawer.tsx` | Connect a provider. Reuse unchanged. |
| Features/GitProviders/RepoCombobox | `.../repo-combobox.tsx` | Pick repositories from a connection. |
| Features/GitProviders/GitSourcePicker | `.../git-source-picker.tsx` | Repo plus branch picker. |
| BranchField (no story) | `.../branch-field.tsx` | Branch or tag field on spin up. |
| Features/GitIntegrations/IntegrationRow | `frontend/src/pages/git-integrations/components/integration-row.tsx` | Provider connection header line. |
| Features/GitIntegrations/GitIntegrationDrawer | `.../git-integration-drawer.tsx` | Edit a connection. |
| Features/Previews/EnableRepoWizard | `frontend/src/pages/previews/components/enable-repo-wizard/` | Rhythm reference for the connect-application flow. |
| Features/Previews/RepositorySettingsDrawer | `.../repository-settings-drawer.tsx` | Reference for per-repository settings. |
| ProviderLogo (no story) | `branded/provider-logo.tsx`, `brand-icons.tsx`, `brand-icon-registry.ts` | Provider and addon logos. SVGs in `brand/`. |

## Canvas

| Story | Path | Use |
|---|---|---|
| Features/Canvas/CanvasEditor | `frontend/src/pages/stacks/components/editor/tabs/architecture/canvas-editor.tsx` | The canvas. Read-only for shape. |
| Features/Canvas/ResourceNode, NodeGlyph, AttachmentNode | `.../nodes/` | Service nodes. |
| Features/Canvas/ConnectionEdge | `.../edges/connection-edge.tsx` | Edges. |
| Features/Canvas/ResourceDrawer | `.../resource-drawer.tsx`, `drawer-tabs/` | Configure a service. Tabs renamed Configuration, Variables, Runtime. |
| Features/Canvas/CanvasControls | `.../canvas-controls.tsx` | Zoom and fit only. |
| Features/Canvas/LiveViewToggle | `.../live-view-toggle.tsx` | Live status on nodes. |
| Features/Canvas/AddResourcePopover, CanvasContextMenu, MountPathDialog, VolumeDrawer | same folder | Reference only. Add and delete are dropped. |
| Features/EditorChrome/CanvasEditorShell | `frontend/src/pages/stacks/components/editor/canvas-editor-shell.tsx` | Full-bleed shell with top bar and inspector host. |
| Features/EditorChrome/PublicEndpointRow | `.../public-endpoint-row.tsx` | Stack URL in the header. |
| Features/EditorChrome/ValidationBanner | `.../validation-banner.tsx` | Stackfile validation errors. |
| Features/EditorChrome/ViewChangesModal | `.../view-changes-modal.tsx` | Summary before Apply creates a release. |
| Features/EditorChrome/DeployPill, AutosaveStatus | same folder | Reference only. Replaced by the status pill; no drafts. |
| Features/Logs/LogsTab, LogViewer; Features/Metrics/MetricsTab | `.../tabs/logs/`, `.../tabs/metrics/` | Keep as entry points, not redesigned. |

## Forms and overlays

| Story | Path | Use |
|---|---|---|
| Primitives/Drawer | `ui/drawer.tsx` | Form drawers at 560. |
| Primitives/Dialog | `ui/dialog.tsx` | Ask 440, form 560, work 760. |
| Branded/ConfirmDialog (ConfirmProvider) | `branded/confirm.tsx` | Every confirmation. Called through the app-root confirm service, never inline. |
| Branded/FormSection, FieldShell | `branded/form-section.tsx`, `field-shell.tsx` | Form layout. |
| Branded/FieldError (no story) | `branded/field-error.tsx` | Validation text. |
| Branded/Disclosure (no story) | `branded/disclosure.tsx` | Advanced sections. |
| Branded/BlockedAction (no story) | `branded/blocked-action.tsx` | "Connect an application first" states. |
| Branded/DangerZone | `branded/danger-zone.tsx` | Disconnect application, tear down. |
| Branded/EyebrowLabel, Panel (no story) | `branded/eyebrow-label.tsx`, `panel.tsx` | Section labels and right-rail panels. |
| Primitives/Tabs, SegmentedControl, Select, MultiSelect, Command, Popover, DropdownMenu, Input, Checkbox, Switch, RadioGroup, Kbd, Skeleton, Toast, Tooltip | `ui/` | As named. |
| Features/Stacks/NewStackDrawer, Features/Previews/NewPreviewEnvDrawer, Features/Addons/AddonDrawer | various | Drawer chrome and footer rhythm references only. |

## Not present, do not invent

Chat bubbles, avatars, progress bars, kanban boards, generic cards with grey fills. Chat rows are built from EventRow. A component missing from this list gets a note on the artboard.
