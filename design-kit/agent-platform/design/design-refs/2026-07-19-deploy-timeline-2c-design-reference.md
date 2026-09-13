# Design reference — Deploy Timeline "2c Bright panels"

Source: Claude Design project `6ea0be9f-3339-489f-b8cd-7c09d2bc7226`, file `Deploy Timeline Options.dc.html` (fetched 2026-07-19 via DesignSync). User picked option **2c — Bright panels** from the split-console series (2a schematic grid / 2b terminal flush / 2c bright panels).

## Component inventory (bundle)

| Screen | Source | Notes |
|---|---|---|
| 2a Schematic grid | `Deploy Timeline Options.dc.html#2a` | rejected |
| 2b Terminal flush | `#2b` | rejected |
| **2c Bright panels** | `#2c` | **chosen** — roomier padding, status pills, sans-serif messages, "most product-UI" |
| 1a/1b/1c (turn 1) | `#1a` `#1b` `#1c` | earlier exploration, superseded by 2-series |

## Intent summary (from design copy)

Split console: resources and activity visible at once — no tab-switching during an incident. Click a resource to isolate its events and pin its detail (image, status, last error) above the console; click "all resources" to zoom back out. 2c treatment: statuses are pills, event messages are sans-serif with mono resource tags, selected resource earns an amber hairline. Bright surface, holds in dark.

## Structure (2c)

- Card panel (`bg-card`, rounded, border) below the existing Build → Deploy → Ready stepper.
- **Left rail (256px, border-r)**: `RESOURCES` mono label + `n/m ready` count; "all resources" row (hollow dot, event count); one row per resource: tone dot · mono name · uppercase status pill (tone-colored border). Selected row: amber hairline border + page-bg fill; hover `bg-elev`.
- **Right console**: header `ACTIVITY · {scope}` (scope in amber) + green `live` pulse while streaming. When a resource is selected, a pinned detail strip (`bg-elev`, border-b): dot, mono name, status, `▢ image`, and the failure message in mono red. Event rows: mono time (56px, tabular) · level glyph (• ✓ ! ✕, level-colored) · mono resource column (90px, "release" when release-scoped) · sans-serif compacted message.
- Message compaction (design `cm()`): `resource_deploying` → "Deploying — {detail}", `resource_waiting` → "Waiting — {detail}", `resource_ready` → "Ready", `resource_failed` → "Failed to start — {detail}"; other types keep the raw message.

## Token mapping (bundle → `frontend/src/index.css`)

| Bundle token | Live token / class |
|---|---|
| `--bg` | `--background` / `bg-background` |
| `--bg-card` | `--card` / `bg-card` |
| `--bg-elev` | `--muted` / `bg-muted` (existing hover convention) |
| `--border` | `--border` |
| `--amber` | `--brand` (`text-brand`, `border-brand`) |
| `--fg1` | `text-foreground` |
| `--fg2` | `text-fg-2` |
| `--fg3` / `--fg-muted` | `text-fg-muted` |
| `--ok` | `text-success` |
| `--warn` | `text-warn` |
| `--err` | `text-danger` |
| `--info` | `text-info` |
| `--err-soft` | `bg-danger-bg` |

No new colors; 0.5px hairlines normalized to the codebase's standard 1px `border`.

## Acceptance criteria

- Resource click filters console to that resource's events and pins its detail; "all resources" restores the full stream.
- Failing resource: pill + dot in danger tone; pinned detail shows the failure message (mono, danger) plus a one-shot crash-log snapshot for runtime crashes ("Open in Logs" dropped — the Logs tab is live-stream-only, so it can't show a crashed container's output).
- Live pulse only while the event stream is open; historical post-mortem renders the same panel without it.
- Works in light and dark (single token set, no raw hex).

## Implementation target

Replaces `ResourceOutcomeList` + `ReleaseActivityFeed` in `frontend/src/pages/stacks/components/editor/tabs/deployments/timeline/` (used by `live-release-body.tsx` and `release-post-mortem.tsx`).
