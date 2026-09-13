# Stackdome agent platform: design kit

Everything needed to design and prototype the agent platform screens. Attach this folder to a Claude Design session. Link the repository as well, but read `context/reference-code-status.md` first: large parts of the current product are reference only and are no longer supported.

## What is in here

| Path | Role |
|---|---|
| `prompts/00-preamble.md` | Paste first in every session. Product summary, vocabulary, banned words, IA, binding design rules, component reuse map. |
| `prompts/01` to `10` | One prompt per screen. Each lists goal, data, layout, states (one artboard each), reuse, rules, out of scope. |
| `prompts/11-interaction-contract.md` | What must actually work in each prototype: which drawers open, which forms validate, which state transitions run. |
| `context/product-brief.md` | Positioning and MVP scope. |
| `context/domain-model-v2.md` | The domain model, glossary, entity relationships, DDL, lifecycle, reference flow. Authoritative for words and data. |
| `context/reference-code-status.md` | Which parts of the linked repository are still the product and which are reference only or dropped. |
| `design/DESIGN-PRODUCT.md` | The design rules. Copy of the repo root file as of 2026-09-09. If this and anything else disagree, this wins. |
| `design/tokens.css` | Colour, type and spacing tokens. Copy of `frontend/src/index.css`. OKLCH here is the colour truth. |
| `design/conventions.md` | Component conventions used by the synced design system. |
| `design/components-map.md` | Every reusable component: story title in the synced design system, repo path, what it is for on these screens. |
| `design/design-refs/` | Earlier design references from previous Claude Design rounds: git integrations, drawer ledger, deploy timeline, workspace collaboration. Precedent, not instruction. |
| `brand/` | Brand mark source, provider and addon logos, empty-state illustrations (light and dark). |

The design system itself is already synced to the Claude Design project "Stackdome Bone". Use those components. Do not rebuild primitives from the CSS.

## How to run a session

1. Attach this folder. Link the repository.
2. Paste `prompts/00-preamble.md`.
3. Paste one screen prompt (`01` to `10`). Pairing is fine when screens share chrome: `01+02`, `03+04`, `05+06+07`, `08+09+10`.
4. Say: "Build every numbered state as its own artboard, light and dark side by side. Make the overlays functional per `prompts/11-interaction-contract.md`."
5. When Claude Design wants a component that is not in `design/components-map.md`, it should add a note on the artboard, not invent one.

Order: shell first (every screen sits inside it), then Tasks list and Task detail, then the rest. Every state is built in light and dark together, not as a later pass.

## What "functional" means here

Prototypes, not production code. Mock data shaped like the DDL in `context/domain-model-v2.md`. Navigation between the screens in this kit works. Drawers, dialogs, tabs, filters, and the chat composer respond. No real network.

## Bringing designs back

Each finished share link goes through the repo's `ingest-design-bundle` skill, which writes a design reference into `dev-docs/design-refs/`. Contradictions between a design and its prompt get resolved in the prompt file; the prompts are the spec.
