# Context

Ubiquitous language for Stackbox, one line per term. This repo is single context: this file is the whole glossary.

## Terms

- **Application Instance** (short form: Instance). Code: `ApplicationInstance`, `instance`. Route: `/instances`, `/instances/:id`. "Instance" alone in lists, table headers, column labels and the sidebar; "Application Instance" in page titles, empty states, and the first mention on a screen.
- **Spin up application instance** (short form: Spin up). Code: `spinUpInstance`.
- **Purpose**. Code: `InstancePurpose`. What an instance is for: task, preview, load test, scratch, persistent.
- **Release**. Code: `Release`. One version deployed into an instance.
- **Stackfile**. Code: `stackfilePath`. A file name, left unchanged.
- Unchanged elsewhere: Organization, Repository, Application, Service, Report, Task, Phase, Resolution, Run, Check, Artifact, Pull request.

## Banned on screen

Environment, Deployment, Job, Workflow, Attempt, Preview environment, Project, and Stack as a noun for the running copy. Renames happen in `apps/web/src/api/mappers/` and in API presenters, never inside components.

Banned everywhere a person reads output: em dashes, competitor product names.

## Enums

Every phase, resolution, purpose, check kind and outcome, pull request state, coarse status and role is a contract-generated enum. Names only, listed here for orientation; the contract (`packages/contract/openapi/stackbox_api.yaml`) is the source of truth for the actual values.

- `repo_provider`
- `connection_status`
- `instance_purpose`
- `instance_status`
- `release_status`
- `report_source`
- `task_kind`
- `task_phase`
- `task_resolution`
- `run_outcome`
- `sandbox_status`
- `execution_status`
- `check_kind`
- `check_outcome`
- `artifact_owner`
- `artifact_kind`
- `pr_state`
- `message_role`
- `coarse_status` (derived, not a DB type)
- `stackfile_sync` (derived, not a DB type)
- `service_kind` (derived, not a DB type)
- `org_role`
- `application_role`
