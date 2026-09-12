# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Stackbox: an agent-driven task runner extracted from Stackdome. An agent works a bug report or onboarding task inside an isolated Application Instance, runs checks, and opens a pull request. NestJS 11 API plus a React 19 SPA in one pnpm workspace. Single context: no cluster-agent spoke, no Kubernetes.

## Architecture

No hub-and-spoke split; `apps/api` is the whole backend. Modules under `apps/api/src/`, each a deep module with a narrow `index.ts` surface: `auth`, `access`, `organizations`, `repositories`, `applications`, `instances`, `releases`, `tasks`, `reconciler`, `db`, `ports`. Full module table and dependencies: spec `dev-docs/specs/2026-09-12-stackbox-design.md` §5.3.

Ports (`SandboxProvider`, `AgentRuntime`, `DeployTarget`, `GitProvider`, `Clock`) are the seam to the future sandbox vendor. Every port ships an in-memory fake for tests and a scripted fake for `dev:mock` and demos; real adapters land when the vendor API is chosen.

The reconciler is a single tick loop (2s interval): claim tasks by lease, observe external state before acting, key every external call by an idempotency key, enforce budget and cancellation outside the agent. See spec §5.5.

`apps/web` is extracted from `stackdome/frontend`: shell, `ui/` and `branded/` primitives, deploy timeline, git provider components, Storybook infra, and the `preview/` mock runtime carry over as is. Pages are new screens written against the interaction contract.

## Commands

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Generate contract types and zod schemas | `pnpm generate` |
| Run all tests | `pnpm -r test:run` |
| Web story tests only | `pnpm --filter @stackbox/web test:stories` |
| Storybook | `pnpm --filter @stackbox/web storybook` |
| Web app against mocked network | `pnpm --filter @stackbox/web dev:mock` |
| Same, empty first-run org | `pnpm --filter @stackbox/web dev:mock:empty` |
| API dev server | `pnpm --filter @stackbox/api dev` |
| Start the database | `docker compose up -d postgres` |
| Create the test database | `bash apps/api/scripts/create-test-db.sh` |
| DB migrations | `pnpm --filter @stackbox/api migrate` |
| End-to-end (Playwright) | `pnpm e2e` |
| Lint everything | `pnpm -r lint` |
| Typecheck everything | `pnpm -r typecheck` |

`DATABASE_URL` must be exported before running the API, its tests, or `pnpm e2e`; see `apps/api/.env.example`.

## Vocabulary

Full glossary: `docs/CONTEXT.md`. Screen and code names, the short form rule, and the banned word list live there. Renames happen only in `apps/web/src/api/mappers/` and API presenters, never inside components.

## Engineering principles

- Deep modules, narrow interfaces. The ORM, the HTTP client and the sandbox vendor never leak past their module.
- Define errors out of existence: tearing down a torn-down instance is a no-op, so is cancelling a cancelled run.
- Separate actions, calculations and data. Phase transitions, coarse status, budget arithmetic, drift detection and timeline derivation are pure functions in `calc/` files, tested without a database.
- TDD: red, green, refactor, one behaviour per step. Shameless green first, then the smallest difference removed. An abstraction arrives with the second concrete case, not before.
- Tests read as sentences, arranged with named builders, one reason to fail. Fakes for ports, not mocks; no mocking library in the API suite.
- No magic strings: every phase, resolution, purpose, check kind and outcome, pull request state, coarse status and role comes from a contract-generated enum.
- No defensive nil-guards around required dependencies, no nil-check-and-panic in constructors. A missing dependency is a wiring bug the e2e suite catches.
- Comments state a constraint the code cannot say, never history, never a restatement of the line below.
- No em dashes in anything a person reads. No competitor names in commits, specs, plans, issues or pull requests.

## Design

Anything visual reads `design-kit/agent-platform/design/DESIGN-PRODUCT.md` first. If a rule and the code disagree, the code is wrong. Update the existing primitive, never fork it, never hand-roll a copy inside a story. One moving thing per screen. Rule areas: surfaces, type scale, control heights, radius, overlays, lists, timeline, colour, destructive actions, shell, themes.

## Testing and verification

Three layers; CI arrives in slice 1:

1. Unit and calc tests, jsdom project: `pnpm test:run`.
2. Story `play` tests in headless Chromium, same command, second project. A `play` only where it proves something the render does not.
3. Playwright `e2e/`: `web` project against `dev:mock` on 5273, `api` project against a Nest app wired to fake ports and a real Postgres 17. `pnpm e2e`.

Assert on roles and text, not pixels. Geometry is verified by measuring gaps between elements, not by eyeballing. Screenshot only on failure.

## Contract and generation

`packages/contract/openapi/stackbox_api.yaml` is the source of truth. `pnpm generate` at the workspace root produces TS types, zod schemas and API validation from it; generated files are never hand-edited. `apps/web` owns HTTP in one `src/api/` module; screens import domain types from `src/api/mappers/`, never raw API objects.

## Repo layout

```
stackboxtest/
  AGENTS.md                     CLAUDE.md is a symlink to it
  pnpm-workspace.yaml
  package.json                  root scripts: generate, test:run, lint, typecheck, e2e
  .claude/skills/                skills copied from Stackdome
  design-kit/agent-platform/    copied from Stackdome, stays the design spec
  packages/contract/
    openapi/stackbox_api.yaml
    src/index.ts
    src/generated/types.ts
    src/generated/zod.ts
  apps/api/                     NestJS 11
  apps/web/                     Vite, React 19
  docs/                         CONTEXT.md, adr/, extraction-log.md, agents/
  dev-docs/                     specs/, plans/ (gitignored, dual-written to the vault)
  e2e/                          Playwright, projects web and api
```

## Agent skills

| Skill | Adaptation |
|---|---|
| `create-pr` | pre-flight becomes `pnpm -r lint && pnpm -r test:run && pnpm -r typecheck` |
| `ingest-design-bundle` | output path `dev-docs/design-refs/`, tokens diff against `apps/web/src/index.css` |
| `grill-with-docs` | reads `docs/CONTEXT.md` and `docs/adr/` |
| `grill-me`, `handoff`, `zoom-out` | none |
| `to-prd`, `to-issues`, `triage` | issue tracker is `Stackdome/StackboxTest`; see `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md` |

Left behind: `add-template`, `design-taste-frontend`, `.agents/`, `skills-lock.json`.

## Issue tracker

Issues and PRDs live in the `Stackdome/StackboxTest` GitHub repo via the `gh` CLI. See `docs/agents/issue-tracker.md`. Triage labels: `docs/agents/triage-labels.md`.

## Domain docs

Single context: `docs/CONTEXT.md` is the only glossary. See `docs/agents/domain.md`.
