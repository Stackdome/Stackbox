# 01 App shell and sidebar

## Goal
Replace the current sidebar's ten items with the agent platform's five. Same shell, same paper frame and white sheet. The sidebar tells a developer where the work is (Tasks) and where the application lives (Applications, Stacks); an admin's one-time setup sits in the Organization group.

## Data on screen
- Org name and mark in the brand band.
- Nav items: Tasks (badge: count of tasks with phase needs input), Applications, Stacks. Organization group: Repositories, Settings.
- Account block at the bottom: user name, email, theme toggle.

## Layout
- Keep the current shell geometry from `DESIGN-PRODUCT.md` §12: brand band, item height, group label style, collapsed rail behaviour, sheet radius 12, sheet edge as outline.
- Badge on Tasks: small numeric badge, right-aligned in the item, only when count > 0. Uses the "needs you" colour, the same colour the Tasks list uses for that status.
- Collapsed rail keeps the badge as a dot on the icon.

## States (one artboard each)
1. Populated: 2 tasks need input (badge "2"), Tasks active, a Tasks list behind it.
2. Blank organization: no applications, no repositories, no tasks. Sidebar identical (items never hide), sheet shows the Applications empty state from prompt 06 so the first action is visible.
3. Collapsed rail with the badge dot.
4. Admin vs member: Repositories and Settings visible to admins only. Show the member variant with the Organization group absent.

## Reuse
- `Features/AppSidebar`, `Primitives/Sidebar`, `Features/ThemeToggle`, `Primitives/Badge`.
- Existing `nav-items.ts` group model: first group unlabeled, second labeled "Organization".
- Icons from lucide: Tasks = `ListChecks`, Applications = `LayoutGrid`, Stacks = `Layers` (existing), Repositories = `GitBranch` (existing), Settings = `Settings`.

## Rules
- §12: a label above the first group is furniture. No "Platform" label.
- One moving thing: the badge count changes, nothing animates on nav.
- Do not redraw the account block or the brand band.

## Out of scope
Projects, Previews, Addons, Secrets, Object Stores, Clusters, Domains, Image Registries are gone from this product. Do not keep them as disabled items.
