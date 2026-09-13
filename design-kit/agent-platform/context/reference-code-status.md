# Reference code status

The linked repository is the current Stackdome product: a self-hosted PaaS. The agent platform reuses its shell, design system, canvas, deploy timeline and Git components, and drops most of its pages. Use this table before copying behaviour from the code.

## Still the product (reuse as is)

| Area | Path | Note |
|---|---|---|
| App shell, sidebar, sheet header | `frontend/src/components/app-layout.tsx`, `app-sidebar.tsx`, `sheet-header.tsx`, `nav-items.ts` | Items change (see prompt 01). Geometry and behaviour stay. |
| Primitives and branded components | `frontend/src/components/ui/`, `frontend/src/components/branded/` | The design system. |
| Canvas rendering | `frontend/src/pages/stacks/components/editor/tabs/architecture/` | Nodes, edges, glyphs, live view, controls, resource drawer. |
| Deploy timeline | `frontend/src/pages/stacks/components/editor/tabs/deployments/` | Rail, nodes, failure card, split console, build logs. Reused for task timelines and release lists. |
| Logs and metrics tabs | `frontend/src/pages/stacks/components/editor/tabs/logs/`, `tabs/metrics/` | Keep as entry points from the stack view. Not redesigned. |
| Git provider connection | `frontend/src/components/git-source-picker/`, `frontend/src/pages/git-integrations/` | Connect provider drawer, repo combobox, branch field, integration row. |
| Stacks list rows and cards | `frontend/src/pages/stacks/components/list/` | Columns change (purpose, owner, expiry). Row rhythm stays. |
| Repository-scoped list pattern | `frontend/src/pages/previews/components/repository-rail.tsx`, `repository-context-line.tsx` | Pattern reference for grouping by repository. |
| Multi-step flow rhythm | `frontend/src/pages/previews/components/enable-repo-wizard/`, `frontend/src/pages/stacks/components/create/` | Reference for the connect-application page. |
| Storybook fixtures and handlers | `frontend/.storybook/` | Shape of mock data. |

## Reference only: behaviour no longer supported

| Behaviour in the code | Status | What replaces it |
|---|---|---|
| Adding resources on the canvas (`add-resource-popover.tsx`, context menu add, drag to connect) | Dropped | Topology comes from the Stackfile. Canvas is read-only for shape. |
| Deleting resources or volumes on the canvas (`delete-resource-summary.tsx`, volume drawer delete) | Dropped | Same. |
| Changing a service's image or source in the resource drawer | Dropped | Stackfile owns it. Drawer configures variables and runtime only. |
| Draft stacks and autosave (`/stacks/draft`, `use-canvas-draft.tsx`, `autosave-status.tsx`) | Dropped | A stack is spun up from an application, not drafted on a canvas. |
| New stack journey (`/stacks/new`, `/stacks/create`, templates, blocks, compose import) | Dropped | Spin up stack drawer (prompt 10) and connect application (prompt 07). |
| Deploy pill and "apply" of a whole stack | Reference only | Variable and runtime edits in the drawer create a Release. The timeline shows it. |
| Previews page and preview configs | Dropped as a page | Preview is a stack purpose. |
| Projects | Dropped | Application replaces project as the grouping. |
| Addons, Secrets, Object stores, Domains, Clusters, Image registries pages | Dropped from navigation | Credentials refs live on the application config tab. Infrastructure is not user-facing here. |
| Resource drawer tab names Configuration, Environment, Deployment | Renamed | Configuration, Variables, Runtime. Environment and Deployment are banned words. |

## Words in the code that must not reach the screen

The code says Environment, Deployment, Job, Preview environment, Project in places. On screen use Stack, Release, Task, stack with purpose preview, Application. See the glossary in `domain-model-v2.md`.
