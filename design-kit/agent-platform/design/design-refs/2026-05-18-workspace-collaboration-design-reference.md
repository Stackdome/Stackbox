# Design Reference — Workspace Collaboration

**Bundle:** `workspace-collaboration` (Claude Design share `xMpi42Gva5l6WtOMB6vSww`)
**Primary file the user landed on:** `project/Implementation reference.html` — the consolidated canvas, **original IA kept: Users and Teams are separate pages, no unified collapse.** The `Users (unified).html` exploration was explicitly rejected.
**Date:** 2026-05-18

---

## 1. Intent summary (from `chats/*.md`)

The feature is **org-level user + team management + invite-by-token signup** for Stackdome.

Iteration path:
1. chat1 — 3 Users variants explored (classic table / master-detail / grouped-by-team). User picked **Variant 1 "Classic table"** as the base.
2. Sidebar IA settled: existing `PLATFORM` group + new `SETTINGS` group with **Users**, **Teams** only. "Invitations" and "Roles & access" were trialled then **removed** — pending invites render inline in the Users table, so there is **no separate Invitations page**.
3. chat2 — invited rows simplified (no inline "email failed" noise; `Last active` shows `—` for pending). Teams page + team detail + create/delete dialogs built. Invite dialog slimmed (Expires field + recap card dropped).
4. **Where the user landed:** `Implementation reference.html` — one canvas, separate Users & Teams, every state covered. Build that.

Scope the user asked for, in order: **Users page → Teams page → invitation token acceptance page.**

---

## 2. Component inventory

| Screen / component | Bundle source | Notes |
|---|---|---|
| App shell (sidebar + topbar + icon set) | `project/shell.jsx` | `PLATFORM` group + `SETTINGS` group (Users, Teams). Lucide-style stroke icons inlined. Per-artboard light/dark toggle in topbar. |
| **Users page** (classic table) | `project/variant-1.jsx` | States: `default`, `loading` (skeleton rows), `no-match`, `empty` (empty org), `error`. Pending invites render as inline rows at top of same table. |
| Invite User dialog | `project/invite-dialog.jsx` | States: `form`, `filled`, `validation`, `submitting`, `success-sent`, `success-failed`, `server-error`. |
| **Teams list page** | `project/teams.jsx` | States: `default`, blank-only-default-team, `loading`, `error`. |
| **Team detail** | `project/team-detail.jsx` | engineering (default, 12 members), small team, blank (no members). Members table + 5 resource tiles. |
| Create / Delete team dialogs | `project/team-dialogs.jsx` | Create: name + slug preview + description. Delete: destructive, type-team-name-to-confirm, shows orphaned resource count. |
| **Signup acceptance page** | `project/acceptance.jsx` | Pre-auth, no app chrome, centered card. States below. |
| Mock data (API-shaped) | `project/data.js` | `MOCK_USERS`, `MOCK_PENDING`, `MOCK_TEAMS`, `USER_LIST` pagination envelope. |
| Acceptance criteria | `project/acceptance.jsx` knobs + chat verifier notes | See §4. |

Ignore: `Users (unified).html`, `users-unified.jsx`, `variant-2.jsx`, `variant-3.jsx` (rejected explorations), `_check/`, `uploads/`, `design-canvas.jsx`.

---

## 3. Token mapping

Bundle `project/tokens.css` header literally states: *"Stackdome design tokens — copied verbatim from `frontend/src/index.css`"*. Diff confirms: **all color / radius / spacing tokens are identical**. The only diff lines are scaffolding the bundle strips for standalone rendering:

| Bundle `tokens.css` | Live `frontend/src/index.css` | Status |
|---|---|---|
| (omits) `@import "tailwindcss"`, `@import "tw-animate-css"`, `@custom-variant dark` | present | **scaffold-only** — live file already has these |
| `--font-sans: 'Geist', …` / `--font-mono: 'Geist Mono', …` | same family, defined via live setup | **match** |
| `--background`, `--foreground`, `--card`, `--brand`, `--border`, `--muted`, `--danger*`, `--warn*`, `--radius-*`, `--popover`, `--sidebar-*` | identical oklch values | **match — reuse by name** |

**Conclusion: zero new tokens. Reuse every token by name from `frontend/src/index.css`. Do NOT hardcode hex/rgb/oklch — the JSX uses `var(--…)` throughout; keep it that way.** The few inline raw values in the bundle (e.g. drop-shadow rgba on the accept card, `#1a1207` radio dot) are decorative one-offs — map to existing tokens or keep as scoped local style, do not promote to globals.

---

## 4. Acceptance criteria

### Users page (`variant-1.jsx`)
- Columns: **User** (avatar + name + email) · **Org role** · **Teams** (chip: ★ if default_team, team name mono, role muted, one chip per team) · **Last active** · row actions (`⋯`).
- Pending invites render as **inline rows at top** of the same table — dashed mail icon, email in name slot, `invited` warn badge, sub-line "invited by X · when", Last-active column → "expires …" in warn color.
- Toolbar: search · role segmented (All / Active / Invited) · team filter.
- Row menu — **pending**: Copy link · Resend · Change team · **Revoke** (danger). **active**: Edit teams · Promote/Demote (Promote to OrgAdmin / demote) · Copy ID · **Remove** (danger).
- States: default, loading (8 skeleton rows + skeleton pagination), no-match (clear-filters CTA), empty org, error 500. Pagination footer: "Showing 1–15 of N", page size select.

### Invite User dialog (`invite-dialog.jsx`)
- Fields mirror OpenAPI invite-create exactly: **email · team_name · role (Developer | Viewer)**. (`expires_in_days` referenced in header comment but Expires field was **dropped** per chat2 — confirm against live API.)
- Email: inline validation ("already a member of this organisation"), red border + danger ring.
- Team: combobox `TeamPicker`, workspace default team preselected.
- Role: two `RoleCard`s (Developer = create/edit/deploy/remove; Viewer = read-only).
- `server-error`: dismissible banner showing `POST /v1/orgs/default/invites returned 500`, input preserved.
- `success-sent`: one-time link + "Expires in 1 day. This link won't be retrievable again — copy it now."
- `success-failed`: invitation created but `email_sent=false` — surface the link prominently as the fallback.

### Teams list (`teams.jsx`)
- Columns: **Team** (mark + name + `default` chip + description) · **Members** (avatar stack + count) · **Scoped resources** (one-line summary) · **Created** · actions.
- Row menu: Manage members · Rename (disabled for default_team) · Delete (disabled for default_team).
- Blank state when only the default team exists: "you have" panel + empty-state CTA.

### Team detail (`team-detail.jsx`)
- Back chip → header (mark/name/default badge, Rename disabled if default, Add member primary).
- 5 resource tiles: Stacks · Secrets · Volumes · Addons · Object stores (read-only counts).
- Members table: **User · Org role · Team role · Joined · Last active · actions**.
- Member row menu: Change to Viewer / Promote to Developer · Open profile · Remove from team (danger).
- States: default, no-match, empty ("Add first member").

### Create / Delete team (`team-dialogs.jsx`)
- Create: name (required) + URL-slug live preview + optional description; helper "team starts empty, org admins see every team, non-admins only see teams they belong to".
- Delete: destructive; type the exact team name to enable; shows count of resources that will be orphaned; default team cannot be deleted.

### Signup acceptance page (`acceptance.jsx`)
- Pre-auth, **no app chrome**, centered card on brand-tinted background, own header (logo + "Need help?").
- `InviteMeta` block shows: org, team (+ default flag), role badge, invited-by (avatar+name+email), expires-in.
- States: `new-user` (email disabled+prefilled, full name required, password ≥12 chars → "Create account and join"), `existing-user` (confirm+join one-click), `wrong-account` (signed in as someone else — sign out / switch), `accepting` (spinner, fields locked), `accepted` (success interstitial → redirect), `expired`, `revoked`, `already-accepted`, `not-found`.
- URL shape: `/signup?invite_token=inv_…`.

---

## 5. API-shaped data contract (from `data.js` — verify against live OpenAPI)

**User row:** `id, name, email, org_role (OrgAdmin|OrgMember), last_active_at, teams: [{ team_id, team_name, role (Developer|Viewer), default_team }]`
**Pending invite (projected onto user row):** `id (inv_…), pending: true, email, invited_by, invited_at, expires_at, last_active_at: null, teams: [{team_id, team_name, role, default_team}], email_sent`
**User list envelope:** `{ items, total, page, page_size, total_pages }`
**Team:** `id, name, default_team, member_count, created_at, description, resources: { stacks, secrets, volumes, addons, object_stores }`
**Accept payload:** `org_name, team_name, team_default, role, email, invited_by:{name,email}, expires_in`

> `data.js` comments assert these mirror the OpenAPI records. **Brainstorming must reconcile against `config/openapi/stackdome_api.yaml` — the spec is source of truth, the mock may have drifted (e.g. `expires_in_days`, exact role enum, org/team membership endpoints).**

---

## 6. Source-file map (cite these in the plan)

- `shell.jsx` → sidebar/topbar/Icon/Avatar/RoleBadge/StatusBadge — shared chrome, sidebar IA.
- `variant-1.jsx` → Users page table, rows, pending rows, states, row menus, pagination.
- `invite-dialog.jsx` → Invite dialog, `TeamPicker`, `RoleCard`, all 7 states.
- `teams.jsx` → Teams list table, blank/loading/error.
- `team-detail.jsx` → team detail header, resource tiles, members table + member row menu.
- `team-dialogs.jsx` → Create team + Delete team (type-to-confirm) modals.
- `acceptance.jsx` → pre-auth signup-accept card, 9 states, `InviteMeta`.
- `data.js` → API-shaped mock contract for all of the above.

---

## Handoff

Feed this artifact to `superpowers:brainstorming` → fold a **"Design reference"** section into the Workspace Collaboration spec. Next concrete steps the user asked for: create an isolated worktree, audit the backend APIs in `config/openapi/stackdome_api.yaml` (users / teams / invites / accept) against §5, then spec Users → Teams → Accept in that order.
