# Design reference — Git Integrations redesign (2026-07-12)

Source: Claude Design final bundle `git-integrations-final.dc.html` (single-file JSX-in-HTML, dark-only mock).
Target: `frontend/src/pages/git-integrations/index.tsx` + `add-integration-wizard.tsx`.
Live tokens: `frontend/src/index.css`.

---

## 1. Component / screen inventory

The mock has a "Preview state" segmented control (List / Empty / Load error / + Add integration) — demo chrome only, do not implement. Sidebar/header chrome is the existing app shell; only the page content area is in scope.

### 1.1 Page header
- `h1` "**Git integrations**" (26px semibold, tight tracking) + subtitle paragraph:
  - "**Grant Stackdome access to your repositories for clones, builds, and preview environments.**"
  - (Current copy: "Access to your repositories for preview environments and builds." — copy changes.)
- Right-aligned primary button: plus icon + "**Add integration**" (brand-filled, dark foreground).

### 1.2 Load-error state (new — currently just a red `<p>`)
- Full-width danger-tinted rounded panel (danger border at 40% alpha, danger bg ~7% alpha), centered column:
  - Circular danger icon chip (triangle-alert).
  - Title "**Couldn't load integrations**".
  - Body "**The server returned a 500. Your integrations are safe — this is a display issue.**" (copy pattern: reassure + explain; real impl should say "We couldn't reach the server" style copy plus the actual error).
  - Mono detail line: "**Error: request failed with status 500**" (real impl: actual error message, mono, fg-muted).
  - Secondary "**Retry**" button (card bg, strong border, refresh icon) → re-fires the list fetch.

### 1.3 Empty state
- Dashed-border rounded panel, centered column: square icon tile (git-branch glyph), then:
  - Title "**No git integrations yet**" (current: "No git integrations").
  - Body "**Connect a provider so Stackdome can clone your repositories and trigger preview environments on every push.**"
  - Primary button "**Connect a provider**" (plus icon) — note different label from header button.

### 1.4 Summary stat strip (new)
Three equal-width stat cards above the list (card bg, border, radius 10px):
- Colored 8px dot + big count (24px semibold) + caption (12px muted):
  1. green dot — "**Connected & ready**" (count of active/installed integrations)
  2. yellow dot when >0 else muted — "**Need your attention**" (unhealthy + pending_install + missing creds)
  3. brand dot — "**Repositories reachable**" (sum of reachable repo counts)

### 1.5 List section
- Eyebrow label (mono, 10px, uppercase, letter-spacing 1.5px, fg-muted): "**Connected providers · {n}**".
- Single bordered rounded container (card bg); rows divided by hairline borders (no per-row cards like current Panel).

### 1.6 Row anatomy (per integration)
Left → right, single flex row, hover bg tint:
1. **Provider logo tile** 40×40, rounded 10, elevated bg + border; real provider logos (GitHub mark, GitLab, Bitbucket, Gitea, generic git-branch for "Other").
2. **Name block** (fixed 180px): provider display name 15px semibold ("GitHub", "GitHub Enterprise", "GitLab", "Bitbucket") over host in mono 11.5px fg-muted ("github.com", "github.acme-corp.com", …).
3. **Auth-method pill** (fixed 130px): outlined pill, small icon + label — "**GitHub App**" (app icon) / "**Access token**" (key icon) / "**App password**" (key icon, Bitbucket). Replaces raw `type` enum badge.
4. **Access meter** (flex): label row (left: access label 11.5px; right: mono count) over a 5px progress track:
   - github_app connected: "**{n} installation(s)**" / "**{n} repos**", brand fill proportional to max repos.
   - token connected: "**Token-scoped access**" / "**this host**", small fixed brand fill (~22%).
   - needs setup: "**No repositories yet**" / "**finish install**", 0% (fill color warn).
   - broken: "**Access blocked**" / "**0 repos**", 0% (fill color danger).
5. **Status cell** (fixed 130px):
   - Connected: green check icon + plain text "**Connected**" (muted-fg text, NOT a pill — quiet treatment).
   - Needs action: colored pill (dot + label, status-tinted bg/border): "**Needs setup**" (warn) or "**Action needed**" (danger).
6. **Overflow menu button** (30×30 icon button, ellipsis) replacing the current inline verify/delete icon buttons.

Non-connected rows also get a faint status-tinted row background + inset status ring (statusColor at ~5%/24% alpha).

### 1.7 Row action banner (new — attached under the row, status-tinted)
- Pending-install (warn): triangle-alert icon + "**The app is created but not installed on any account yet, so Stackdome can't see your repositories.**" + brand ghost CTA "**Finish install →**" (re-opens wizard at GitHub phase).
- Unhealthy (danger): circle-alert icon + issue text, e.g. "**The app password was rejected (HTTP 401). Repositories on this host can't be cloned until it's updated.**" + CTA "**Update credentials →**".

### 1.8 Row overflow menu
236px popover (popover bg, strong border, shadow, fade/slide-in):
- "**Verify repository access**" (shield-check icon) → existing verify dialog.
- "**Sync from GitHub**" with sub-line "**Re-check access now**" (refresh icon) → replaces the installations-block "Refresh" ghost button.
- separator
- "**Remove integration**" (trash icon, danger-tinted text) → existing delete confirm AlertDialog.

### 1.9 Installations framing
The current always-expanded `IntegrationInstallations` block ("account · selection repositories" lines + Refresh button) is folded INTO the access-meter cell as an aggregate ("2 installations / 59 repos"); refresh moves to the menu ("Sync from GitHub"). No per-account listing on the page in this design (data still drives the counts).

### 1.10 Add-integration wizard (modal, 540px, centered — current is 760px)
Header: brand-tinted git-branch icon chip + title "**Add git integration**" + close icon button. Below: 3-segment stepper — 3px bars + mono uppercase labels "**Provider**" / "**Connect**" / "**Done**"; reached bars brand, future bars border; current label white, past muted, future faint.

Phases:
- **Provider** — prompt "**Choose where your repositories live.**"; vertical stacked tiles (not the current grid): logo tile + name + sub + chevron. Names/subs: GitHub "**App install or access token**", GitLab "**Access token**", Bitbucket "**App password**", Gitea "**Access token**", "**Other host**" — "**Token or basic auth**". No footer.
- **GitHub method** — prompt "**How should Stackdome authenticate to GitHub?**"; two option cards:
  - "**Install the GitHub App**" + mono "**Recommended**" badge, brand-tinted card (brand bg 5%, brand border 40%); body "**Fine-grained access you manage on GitHub. Webhooks keep previews in sync — no tokens to rotate.**"
  - "**Use an access token**" (key icon); body "**A fine-grained personal access token with repository read access. Best for automation or Enterprise.**". No footer.
- **Connecting** (new phase) — centered GitHub logo tile, title "**Installing the GitHub App**", body "**Finish the installation in the GitHub popup — we'll pick it up here.**"; 3-step checklist with animated states (done ✓ green chip / active pulsing brand dot / pending empty ring): "**Opening GitHub authorization…**", "**Authorizing the installation…**", "**Fetching accessible repositories…**". (Mock fakes timing; real impl maps to `useGithubConnect` state.)
- **Credentials** — provider recap card (logo + name + "**Connect with an access token**"); fields: "**Host**" (mono input, provider placeholder), conditional "**Username**" (only Bitbucket/Other; helper "**Required for basic auth (e.g. Bitbucket app passwords).**"), "**Access token**" (password, dot placeholder, provider-specific hint below). Inline error card (danger tint): bold "**Couldn't verify the token**" + detail line (mock: "Authentication failed (HTTP 401). The token was rejected — check it hasn't expired and has repository read scope."). The "Simulate an invalid token" checkbox is demo-only — do not implement. Footer: "**Back**" (outline) + primary "**Connect**" → "**Connecting…**" with spinner while submitting; disabled until host+token filled (disabled = dimmed brand).
- **Done** (new phase) — animated green check circle; title "**GitHub App installed**" or "**{Provider} connected**"; body "**Stackdome can now clone repositories from your installed accounts. Webhooks will keep preview environments in sync.**" or "**Stackdome can now clone repositories on {host} using your access token.**"; footer single primary "**Done**" (no Back).

Dialog animations: scrim fade, modal scale/translate-in, per-phase fade-in, check pop-in.

### 1.11 Existing dialogs (kept, entry point changes)
Verify dialog and delete AlertDialog stay as-is; they are now opened from the overflow menu.

---

## 2. Token mapping table

Design is dark-mode-only; map to semantic tokens so light mode works free. **Never ship raw hex.**

| Design use | Design value | Live token (index.css) | Token value (dark) | Verdict |
|---|---|---|---|---|
| Page bg | `#0a0e14` | `--background` | oklch(0.162 0.014 258) = #0a0e14 | match |
| Row/tile/card bg | `#0c1118` | `--card` (#11161e) or `--background` | — | close — use `bg-card`; #0c1118 has no token |
| Elevated tile / input / menu bg | `#11161e` | `--card` / `--popover` (#161c26) / `--input` | match `--card` | match |
| Hover row bg | `#12181f`, `#1a212b` | `--muted` / `--accent` | #161c26 / oklch 0.252 | close — use `hover:bg-muted` |
| Hairline border | `#1f2937` | `--border` | #1f2937 | match |
| Strong border | `#2b3644` | `--border-strong` | oklch(0.36 0.035 257) | close |
| Row divider | `#131a23` | `--border` | — | close — no lighter-divider token; use `border-border` |
| Meter track | `#131a23` | `--muted` or `--secondary` | — | close |
| Brand / primary / links / meter fill | `#f97316` | `--brand` / `--primary` | oklch(0.72 0.20 40) = #f97316 | match |
| Brand hover | `#ea6a0e` | `--brand-hover` | oklch(0.67 0.20 40) | match |
| Brand tint bg 10–16% | `rgba(249,115,22,.05/.10/.12/.15/.16)` | `--brand-bg` (10%), `--brand-bg-hover` (18%) | — | match/close |
| Brand tint border | `rgba(249,115,22,.4)` | `--brand-border` (30%) | — | close |
| Success (check, dots, done circle) | `#22c55e` (+`#4ade80` chip text) | `--success` / `--success-bg` (12%) | oklch(0.71 0.20 145) ≈ #22c55e | match |
| Warn (setup) | `#eab308`; text `#d6c17a` | `--warn` / `--warn-bg` / `--warn-border` | oklch(0.79 0.16 85) ≈ #eab308 | match; #d6c17a → use `--warn` |
| Danger (error) | `#d9223e`; text `#f0a5af`/`#b6717c` | `--danger` / `--danger-bg` / `--danger-border` | oklch(0.59 0.22 27) ≈ #dc2626 | close; pink text tints → use `--danger` / `--destructive` |
| Primary fg on brand button | `#0a0e14` | `--primary-foreground` | oklch(0.14 0 0) | match |
| Foreground | `#fff` | `--foreground` | oklch 0.98 | match |
| Secondary text | `#cbd5e1` | `--fg-2` | #cbd5e1 | match |
| Muted text | `#94a3b8` | `--muted-foreground` | #94a3b8 | match |
| Faint text | `#64748b` | `--fg-muted` | #64748b | match |
| Faintest text/chevrons | `#475569` | `--fg-muted` | — | close (no fainter token — flag) |
| Disabled brand button | bg `#3d2410`, text `#8a6a4a` | none | — | **new** — use `disabled:opacity-*` on brand button instead |
| Sans font | Geist | `--font-sans` | Geist | match |
| Mono (eyebrows, hosts, counts) | Geist Mono | `--font-mono` + `.eyebrow-muted` / `.mono-num` | match | match |
| Radii | 4/6/8/10/12/14px | `--radius-sm` 2, `--radius-md` 4, `--radius-lg` 8, `--radius-xl` 12 | — | close — mock radii are looser than DS; follow DS scale (buttons/inputs sm-md, cards lg, modal xl) |
| Border width 0.5px | `0.5px` | Tailwind `border` (1px) | — | close — repo convention is default border |
| Menu shadow | `0 8px 24px rgba(0,0,0,.45)` | `--shadow-lg`/`--shadow-xl` | — | close |
| Modal shadow | `0 24px 60px rgba(0,0,0,.5)` | `--shadow-2xl` | — | close |
| Animations | gr-fade / gr-modal / gr-scrim / gr-menu / gr-spin / gr-check / gr-tick | `tw-animate-css` + Radix dialog/dropdown built-ins; `animate-breathe` for the pulsing connect dot | — | close — use existing primitives; respect `prefers-reduced-motion` |
| GitLab/Bitbucket/Gitea logo brand colors | `#e24329` `#fc6d26` `#fca326` `#2684ff` `#609926` | none | — | **new** — third-party logo marks; acceptable as literal SVG brand colors inside logo assets only (get approval or ship monochrome logos) |

No other unmatched values. Flagged "new": disabled-brand-button colors (use opacity), provider logo brand colors (asset-level exception).

---

## 3. Intent summary

What the design changes vs the current page:

1. **Raw enums → human copy.** `github_app` / `git_credentials` / `pending_install` / `active` badges become "GitHub App" / "Access token" / "App password" pills and "Connected" / "Needs setup" / "Action needed" statuses.
2. **Status tone split.** Healthy = quiet (green check + plain text, no pill). Problems = loud (tinted pill, tinted row wash, and an attached banner with a one-line explanation + a single brand CTA that names the fix: "Finish install →", "Update credentials →").
3. **Installations reframed as an access meter.** Per-account installation lines collapse into "{n} installations / {n} repos" with a proportional bar; page answers "how much can Stackdome see" instead of listing accounts.
4. **Refresh relocated.** The installations "Refresh" ghost button becomes menu item "Sync from GitHub — Re-check access now".
5. **Icon buttons → overflow menu.** Verify/Delete inline icons collapse into a kebab menu (Verify repository access / Sync from GitHub / Remove integration).
6. **New summary strip** (3 stat cards) giving fleet-level health at a glance.
7. **Designed error + empty states** replacing the bare text error and reusing warmer copy in the empty state.
8. **Wizard upgrades:** visible 3-step stepper (Provider/Connect/Done), vertical provider list with real logos + per-provider sub-labels, richer GitHub App pitch copy, a dedicated "Connecting" progress phase mapped to popup progress, structured inline error card, and an explicit success ("Done") phase instead of silently closing.
9. **Header subtitle copy** now leads with the grant: "Grant Stackdome access to your repositories for clones, builds, and preview environments."

Interactions implied by markup — **essential**: row hover bg, menu open/close (click-outside), tile hover border-brand, disabled primary until valid, submit spinner, banner CTAs, phase transitions. **Decorative** (nice-to-have, use existing primitives, honor reduced-motion): fade-in of states/phases, modal scale-in, menu slide-in, done-check pop, pulsing active connect step.

Not in the design (keep from current impl): loading state (design has none — keep something token-based), verify dialog contents, delete confirmation dialog, `hasGithubApp` disable of the App option, `useGithubConnect` error surfacing (map into the Connecting phase or GitHub phase error card).

---

## 4. Acceptance criteria

List page
- [ ] Header title "Git integrations"; subtitle "Grant Stackdome access to your repositories for clones, builds, and preview environments."; primary button "Add integration" with plus icon.
- [ ] Fetch failure → danger panel: title "Couldn't load integrations", reassurance body, mono error detail, working "Retry" button; no bare red paragraph.
- [ ] Zero integrations, no error → dashed empty panel: "No git integrations yet", body copy per §1.3, button "Connect a provider".
- [ ] Non-empty → three stat cards: "Connected & ready" (green dot), "Need your attention" (warn dot when >0), "Repositories reachable" (brand dot); counts derived from live data.
- [ ] Section eyebrow reads "Connected providers · {count}" in mono uppercase.
- [ ] Each row shows provider logo tile, human provider name + mono host, auth pill ("GitHub App" / "Access token" / "App password"), access meter, status cell, kebab menu. No raw enum strings anywhere.
- [ ] status active/installed → green check + "Connected" (plain text); pending_install → warn pill "Needs setup"; unhealthy or credentials missing → danger pill "Action needed"; problem rows get tinted wash.
- [ ] pending_install row → warn banner "The app is created but not installed on any account yet, so Stackdome can't see your repositories." + "Finish install →" opening the wizard at the GitHub phase.
- [ ] unhealthy row → danger banner with issue text + "Update credentials →".
- [ ] github_app connected row meter: "{n} installation{s}" left, "{n} repos" right (singular/plural correct), brand fill; token rows: "Token-scoped access" / "this host".
- [ ] Kebab menu: "Verify repository access" (opens existing verify dialog), "Sync from GitHub / Re-check access now" (refresh installations), separator, danger "Remove integration" (opens existing confirm). Closes on outside click/Escape.
- [ ] No inline ShieldCheck/Trash icon buttons; no always-expanded installations sub-list with ghost Refresh.

Wizard
- [ ] 540px-class dialog with icon-chip header "Add git integration", close button, and stepper "Provider / Connect / Done" whose bars/labels reflect the current phase.
- [ ] Provider phase: prompt "Choose where your repositories live."; 5 stacked tiles with logos, names (…, "Other host") and subs ("App install or access token", "Access token", "App password", "Access token", "Token or basic auth"); no footer.
- [ ] GitHub phase: prompt "How should Stackdome authenticate to GitHub?"; brand-tinted "Install the GitHub App" card with "Recommended" badge and copy per §1.10; plain "Use an access token" card; no footer.
- [ ] Choosing App install → Connecting phase: "Installing the GitHub App" + popup hint + 3 checklist steps with done/active/pending states driven by `useGithubConnect`.
- [ ] Credentials phase: provider recap card ("Connect with an access token"); Host (mono, provider placeholder); Username only for Bitbucket/Other with basic-auth helper; Access token (password) with provider hint; footer Back + "Connect" (disabled until host+token; "Connecting…" + spinner while submitting).
- [ ] Submit failure → inline danger card titled "Couldn't verify the token" with the server error; wizard stays open on credentials phase.
- [ ] Success (either path) → Done phase: green check animation, "GitHub App installed" or "{Provider} connected", matching body copy, single "Done" button; parent list refreshed.
- [ ] All colors/fonts/radii via index.css tokens / Tailwind theme classes; zero raw hex except third-party logo SVG fills; animations respect prefers-reduced-motion.

---

## 5. Source map (git-integrations-final.dc.html)

| Piece | Lines |
|---|---|
| Keyframes + hover CSS | 14–36 |
| Preview-state tabs (demo only) | 40–47 |
| Sidebar + header chrome (out of scope) | 49–77 |
| Page header + Add button | 80–89 |
| Load-error state | 91–107 |
| Empty state | 109–124 |
| Summary stat cards | 129–136 |
| List eyebrow + container | 138–139 |
| Row anatomy (logo/name/auth/meter/status/kebab) | 140–179 |
| Overflow menu | 170–177 |
| Setup + issue banners | 180–193 |
| Wizard shell (scrim, modal, header, stepper) | 202–224 |
| Provider phase | 227–240 |
| GitHub method phase | 242–263 |
| Connecting phase | 265–281 |
| Credentials phase (incl. error card, demo checkbox 306–309) | 283–318 |
| Done phase | 320–328 |
| Wizard footer | 331–342 |
| Data model: PROVIDERS/ORDER, logos | 350–375 |
| Demo DATA rows | 377–385 |
| State machine + handlers | 387–434 |
| Derived render values (status/copy/meter logic) | 436–553 |

## Copy revisions (2026-07-12)

- "Connect provider" — page header button and empty-state CTA
- "Connect provider" — wizard modal mono title / sr-only dialog title
- "Remove this integration?" — remove confirmation dialog title
- "Remove" — remove confirmation dialog action button label
- "Integration removed" / "Remove failed" — remove toast success/error titles
- "Needs attention" — unified status label (row pill + summary stat card)
- Row title = provider display name ("GitHub" / "GitLab" / "Bitbucket" / "Gitea" / "Git host"), auth-method pill unchanged
- "Install the GitHub App, or paste an access token." — GitHub method subline
- "No credentials are stored for this integration, so clones will fail." — action-needed banner message
- "Repository access verified" / "Couldn't verify repository access" — verify dialog toast titles
