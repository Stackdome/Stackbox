# Stackdome product brief (text extracted from Stackdome_Product_Brief.pdf, 2026-09-09)

Source of truth for positioning and MVP scope. The domain model in context/domain-model-v2.md supersedes the phase names used here (Queued, Completed) and bans the words Environment and Deployment on screen.


Stackdome Product Brief
Product positioning architecture and investor MVP scope
Stackdome will give coding agents isolated environments of multi-service web applications so they can 
implement, test, and deliver changes as pull requests. The proposed direction builds on the existing 
deployment platform and adds a task-based agent workflow.
Customers connect their repositories and describe the work. Stackdome coordinates the agent, runs the 
required services together, and returns a proposed change with verification evidence and a preview 
when needed. Customers retain their production hosting, deployment process, and merge decision.
Customer problem
Repository access alone is insufficient to verify many application changes. A useful reproduction may 
require a frontend, API, database, workers, authentication, and test data. Teams spend time preparing 
those dependencies and checking whether agent-generated code actually addresses the reported 
behavior.
Positioning
Primary message: Give coding agents the whole application.
Customer promise: Bring an error, bug report, or change request. Get a pull request tested against the 
application it changes.
The initial audience is web application teams whose changes span services and whose reviewers need 
runtime evidence alongside the code diff. Open source supports inspection, extensibility, and 
deployment choice. Reliable setup and verification are the main reasons to adopt the product.
Entry points into one workflow
Source Context supplied
Error tracker Exception, stack trace, event context, and release
Jam or visual report Screenshot, recording, observed behavior, and reproduction clues
Slack or web UI Bug description or enhancement with expected behavior
Existing pull request Candidate changes and instructions for verification
Every entry point creates a Task associated with an application. These are different ways to request 
work within one product, rather than separate products.

Application setup and task workflow
Reusable application configuration
Customers connect a repository and optionally supply a Stackfile path. The agent reads and validates 
an existing Stackfile, or inspects Dockerfiles, Compose files, startup commands, ports, and 
dependencies to generate one. Retain the configuration for future tasks and include generated 
configuration in a reviewable repository change.
Customers supply missing preview credentials, test accounts, and external-service configuration. The 
agent can create fixtures where appropriate. An environment reproduces the configured application 
topology; production data and external dependencies require explicit setup.
Task lifecycle
1. Collect the report and expected behavior. Ask focused questions when the reproduction or 
acceptance criteria are incomplete.
2. Resolve repository and revisions. Preserve the originating commit for runtime errors separately from 
the target branch commit used for the proposed PR.
3. Prepare a Daytona workspace and inspect the application. Establish a baseline environment when 
reproduction requires running services.
4. Create a failing reproduction or acceptance test, implement the change, and run focused local 
checks.
5. Push the candidate commit and open a draft PR. Deploy that revision through Stackdome when 
application-level testing is needed.
6. Run browser or API tests against the ready environment. Attach evidence to the PR and present it 
for human review. Further code changes require fresh verification.
Verification appropriate to the change
Failure or change Verification environment
Function, parser, or validation logic Regression tests inside Daytona
Database, worker, or service interaction Stackdome environment with the required dependencies
Browser behavior or user journey Browser automation in Daytona against the Stackdome 
environment
Track environment readiness, reproduction, and fix verification separately. A healthy deployment does 
not prove the fix works. If the agent cannot reproduce the failure, present the proposal as unverified. 
Test evidence must identify the exact candidate commit and, when applicable, deployment.

System architecture
Use the existing Go backend to coordinate work. Codex runs inside Daytona, where repository access, 
edits, commands, and browser tests execute. Stackdome runs the customer application. Model 
inference is accessed through an external model API.
The task reconciler starts and observes remote operations. Agent progress and execution results return 
to persisted task state; scoped deployment requests go through the backend.
Component responsibilities
Component Status Responsibility
Task API and 
persistence New Requests, conversation, progress, execution identities, and evidence 
references
Task reconciler New Coordinate Daytona executions, deployments, retries, and PR lifecycle
Deployment services Existing Stack, release, and preview creation, readiness, URLs, and logs
Coding harness Integrated Codex inside Daytona investigates, edits, generates configuration, and 
runs tests
Sandbox launcher Small 
addition
Start Codex and capture output and exit status; initially a script or 
wrapper
Task interface New Views in the existing frontend for requests, progress, evidence, and 
PRs
Keep orchestration in a focused module in the existing repository. Reuse organization identity, 
permissions, Git integrations, and deployment service interfaces. A separate orchestration repository is 
an option later if independent releases or installation become necessary.

Execution model and product experience
A task resource driven by reconciliation
Add a persisted Task resource and a TaskReconciler using the existing worker pattern. A separate 
workflow engine is unnecessary for the MVP. The reconciler coordinates durable milestones; the coding 
harness owns the iterative read, edit, execute, and inspect loop inside each agent execution.
Normal phases: Queued, Preparing, Implementing, Deploying, Verifying, Completed. Tasks can also 
enter NeedsInput, Failed, or Cancelled. Skip deployment for tasks verified locally; a failed verification 
can return to implementation within a bounded attempt limit.
Execution guarantees
 Start remote work, record its identity, and return. Subsequent reconciliations observe that execution 
instead of starting a duplicate or blocking a worker for the entire session.
 Persist sandbox and execution IDs, session references, candidate SHA, preview or release ID, 
verified SHA, PR number, and evidence references outside Daytona.
 Handle ambiguous external creation outcomes with supported idempotency or correlation 
mechanisms. Resolve an uncertain outcome before creating another sandbox or execution.
 Use task ownership or leases when multiple backend replicas reconcile work. Rediscover 
unfinished tasks from the database after restart.
 Separate transient API retries from new coding attempts. Enforce cancellation, runtime and cost 
budgets, and environment cleanup outside the agent.
 Validate deployment revision and collect actual test results and artifacts. Treat the agent summary 
as a report to substantiate, not the authoritative proof of success.
Existing preview boundary
The current preview service requires a PR number. A baseline environment needed before the draft PR 
should use ordinary stack and release services, or the workflow can open the draft earlier. Existing 
preview lifecycle behavior should be reused; broader ephemeral cleanup policies must be implemented 
explicitly.
One application centered experience
Tasks show requests, conversation, progress, PRs, and evidence. Environments show running 
instances associated with tasks and changes. Configuration holds repositories, Stackfile, services, 
credentials, and integrations. Slack is another interface to the same task.
The website leads with completed, reviewable work and explains multi-service environments as the 
mechanism. Production hosting remains available without being required for adoption. Open-source 
platform code does not imply that external models or sandbox services are self-hosted.

Two week investor MVP
Demonstrate one representative frontend, API, and database application, one coding harness, and one 
manual input path: a bug description with a screenshot. Add a worker only if it is material to the selected 
reproduction. Preconfigure repository access and test credentials.
Demonstration scope
The audience should see the original failure, the agent-generated change, a deployed candidate 
revision, the same scenario succeeding, and a reviewable PR with evidence. Application onboarding 
may generate the Stackfile once and reuse it during the live task.
Ship persisted tasks, one active investigation at a time, a bounded correction loop, real deployment 
status, and test evidence. Defer Sentry, Jam, and Slack connectors, arbitrary repository onboarding, 
billing, and multiple harnesses.
Delivery plan
Window Outcome
Days 1 and 2 Prove the remote loop from scripts: Codex in Daytona, repository edits, Stackdome 
deployment, and browser access to the preview.
Days 3 and 4 Add persisted tasks and remote execution tracking. Complete the baseline application, 
fixtures, and reproduction.
Days 5 and 6 Finish draft PR creation, revision-aware deployment checks, and verification against the 
preview.
Days 7 and 8 Build task views with progress, screenshots, test results, PR link, and preview link.
Days 9 and 10 Freeze features, rehearse, fix integration failures, measure runtime and cost, and capture 
a backup recording.
Effort and delivery assumptions
Budget an estimated 12 to 16 engineer-days with two engineers working full-time over two weeks. One 
engineer would require a smaller interface and stricter application scope. This estimate assumes the 
existing deployment path works for the selected application. The largest uncertainty is reliability across 
the full agent, deployment, and browser loop.
Use day two as the checkpoint: the core loop should work before UI polish expands. Be transparent that 
broad repository support is a subsequent milestone and that a recording, if used, is a backup.
Measures of progress
Measure time to the first useful result, onboarding effort, reproduction rate, verification quality, reviewer 
effort, accepted fixes, and cost per accepted fix. Count failures to configure or reproduce. PR volume 
alone does not establish customer value.
The product hypothesis is that teams will adopt Stackdome for repeatable, verified application changes 
before considering a production migration. Validate that hypothesis with real customer tasks and paid 
pilots.