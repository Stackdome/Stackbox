# 05 Repositories

Route `/repositories`, Organization group, admin only. Replaces the Git Integrations page. A repository is org-level and may feed several applications.

## Goal
Show every connected repository grouped by the provider connection it came through, make "connect another provider" and "add repositories from this provider" obvious, and show which applications each repository feeds.

## Data on screen
- Provider connections: provider (GitHub, GitLab), connection name or host, auth kind (GitHub App installation, token), health (verified, needs re-auth), connected by, connected at.
- Repositories per connection: full name (`acme/acme-api`, mono), default branch, used-by (application names, count), added at.
- Per repository actions: open in provider, remove (blocked when used by an application: shows the applications instead).

## Layout
- Sheet header: title "Repositories", primary action "Connect provider". Toolbar row: search across repo names, provider filter.
- Body: one section per provider connection. Section header carries the provider logo, connection name, health as `StatusText`, and a "Add repositories" button that opens the existing repo picker for that connection.
- Under each section: §11 rows, one per repository. Name column mono, Default branch, Used by (application names as small chips, "Not used" muted), Added.
- A connection with zero repositories shows a single inline row: "No repositories added yet" with the Add action.

## States (one artboard each)
1. Empty organization, no connections: `EmptyState`, "Connect provider" as the action, one sentence on why (repositories feed applications).
2. One GitHub connection, three repositories, one used by two applications.
3. Two providers (GitHub App plus a self-hosted GitLab token), grouped sections, GitLab connection in "Needs re-auth" with a Reconnect action on its header.
4. Add repositories drawer open for a connection: multi-select list of repos from the provider not yet added, search, footer "Add 2 repositories".
5. Remove blocked: confirm dialog (ask, 440) explaining the repo feeds "Acme Shop" and "Design system" and cannot be removed.
6. Connect provider drawer: reuse as is.

## Reuse
- `Features/GitProviders/ConnectProviderDrawer` unchanged. `Features/GitProviders/RepoCombobox` becomes a multi-select list inside the Add repositories drawer.
- `Features/GitIntegrations/IntegrationRow` for the connection header line, `GitIntegrationDrawer` for editing a connection.
- `Branded/RecordRow`, `Branded/StatusText`, `Branded/ConfirmDialog`, `Branded/EmptyState`, `Branded/ProviderLogo`.
- Read the earlier design reference: `dev-docs/design-refs/2026-07-12-git-integrations-design-reference.md`, and the page: `frontend/src/pages/git-integrations/index.tsx`.

## Rules
- §11: grouped sections use space and a section header, not nested cards.
- §10: remove is destructive; the blocked case explains rather than disables silently.
- Status in rows is `StatusText`.

## Out of scope
Webhook status per repository, branch protection, arbitrary Git hosts beyond what ConnectProviderDrawer already offers.
