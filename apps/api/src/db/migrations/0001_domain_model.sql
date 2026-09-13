CREATE TYPE "public"."application_role" AS ENUM('Developer', 'Viewer');--> statement-breakpoint
CREATE TYPE "public"."artifact_kind" AS ENUM('screenshot', 'har', 'test_log', 'recording');--> statement-breakpoint
CREATE TYPE "public"."artifact_owner" AS ENUM('report', 'task_check', 'task_message');--> statement-breakpoint
CREATE TYPE "public"."check_kind" AS ENUM('instance_ready', 'report_reproduced', 'fix_verified');--> statement-breakpoint
CREATE TYPE "public"."check_outcome" AS ENUM('passed', 'failed', 'inconclusive');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('verified', 'error');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('starting', 'running', 'succeeded', 'failed', 'timed_out', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."instance_purpose" AS ENUM('task', 'preview', 'load_test', 'scratch', 'persistent');--> statement-breakpoint
CREATE TYPE "public"."instance_status" AS ENUM('provisioning', 'ready', 'degraded', 'expired', 'torn_down');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'agent', 'system');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('OrgAdmin', 'OrgMember');--> statement-breakpoint
CREATE TYPE "public"."pr_state" AS ENUM('open', 'merged', 'closed');--> statement-breakpoint
CREATE TYPE "public"."release_status" AS ENUM('queued', 'building', 'live', 'failed');--> statement-breakpoint
CREATE TYPE "public"."repo_provider" AS ENUM('github', 'gitlab');--> statement-breakpoint
CREATE TYPE "public"."report_source" AS ENUM('web', 'slack', 'sentry', 'jam', 'harness');--> statement-breakpoint
CREATE TYPE "public"."run_outcome" AS ENUM('running', 'passed', 'failed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."sandbox_status" AS ENUM('starting', 'running', 'stopped', 'failed');--> statement-breakpoint
CREATE TYPE "public"."task_kind" AS ENUM('fix', 'onboarding');--> statement-breakpoint
CREATE TYPE "public"."task_phase" AS ENUM('intake', 'preparing', 'reproducing', 'implementing', 'deploying', 'verifying', 'hand_over', 'needs_input', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."task_resolution" AS ENUM('fix_verified', 'fix_unverified', 'not_reproduced', 'no_change_needed', 'abandoned');--> statement-breakpoint
CREATE TABLE "application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"repository_id" uuid NOT NULL,
	"stackfile_path" text,
	"synced_at_sha" text,
	"validated_at" timestamp with time zone,
	"credentials_ref" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_org_slug_unique" UNIQUE("org_id","slug")
);
--> statement-breakpoint
CREATE TABLE "application_instance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"purpose" "instance_purpose" NOT NULL,
	"task_id" uuid,
	"created_by" uuid,
	"url" text,
	"status" "instance_status" DEFAULT 'provisioning' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" "artifact_owner" NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" "artifact_kind" NOT NULL,
	"url" text NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sandbox_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"run_id" uuid,
	"external_id" text,
	"session_ref" text,
	"idempotency_key" text NOT NULL,
	"status" "execution_status" DEFAULT 'starting' NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"event_cursor" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "execution_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "git_connection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"provider" "repo_provider" NOT NULL,
	"installation_ref" text NOT NULL,
	"account_login" text,
	"status" "connection_status" DEFAULT 'verified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "git_connection_org_provider_installation_unique" UNIQUE("org_id","provider","installation_ref")
);
--> statement-breakpoint
CREATE TABLE "policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	CONSTRAINT "policy_org_subject_resource_action_unique" UNIQUE("org_id","subject","resource","action")
);
--> statement-breakpoint
CREATE TABLE "pull_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"repository_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"head_ref" text,
	"base_ref" text,
	"is_draft" boolean DEFAULT true NOT NULL,
	"state" "pr_state" DEFAULT 'open' NOT NULL,
	CONSTRAINT "pull_request_repository_number_unique" UNIQUE("repository_id","number")
);
--> statement-breakpoint
CREATE TABLE "release" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"run_id" uuid,
	"commit_sha" text NOT NULL,
	"ref" text,
	"status" "release_status" DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"source" "report_source" NOT NULL,
	"description" text NOT NULL,
	"expected_behaviour" text,
	"reporter" text,
	"external_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"provider" "repo_provider" NOT NULL,
	"external_id" text NOT NULL,
	"full_name" text NOT NULL,
	"default_branch" text DEFAULT 'main' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repository_org_provider_external_unique" UNIQUE("org_id","provider","external_id")
);
--> statement-breakpoint
CREATE TABLE "role_binding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"scope" text NOT NULL,
	CONSTRAINT "role_binding_org_user_subject_scope_unique" UNIQUE("org_id","user_id","subject","scope")
);
--> statement-breakpoint
CREATE TABLE "run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"number" smallint NOT NULL,
	"candidate_sha" text,
	"verified_sha" text,
	"outcome" "run_outcome" DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "run_task_number_unique" UNIQUE("task_id","number")
);
--> statement-breakpoint
CREATE TABLE "sandbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text,
	"status" "sandbox_status" DEFAULT 'starting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stopped_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "service" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"repository_id" uuid,
	"name" text NOT NULL,
	"path" text,
	"image" text,
	CONSTRAINT "service_application_name_unique" UNIQUE("application_id","name"),
	CONSTRAINT "service_source_check" CHECK (repository_id is not null or image is not null)
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"report_id" uuid,
	"instance_id" uuid,
	"origin_release_id" uuid,
	"kind" "task_kind" DEFAULT 'fix' NOT NULL,
	"target_branch" text,
	"phase" "task_phase" DEFAULT 'intake' NOT NULL,
	"resolution" "task_resolution",
	"run_limit" smallint DEFAULT 2 NOT NULL,
	"budget_cents" integer,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"lease_owner" text,
	"lease_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "task_resolution_terminal_check" CHECK (resolution is null or phase in ('hand_over', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "task_check" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"run_id" uuid,
	"release_id" uuid,
	"execution_id" uuid,
	"item_id" text,
	"kind" "check_kind" NOT NULL,
	"outcome" "check_outcome" NOT NULL,
	"commit_sha" text,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_check_fix_verified_release_check" CHECK (kind <> 'fix_verified' or release_id is not null)
);
--> statement-breakpoint
CREATE TABLE "task_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"execution_id" uuid,
	"replies_to_id" uuid,
	"role" "message_role" NOT NULL,
	"body" text NOT NULL,
	"blocking" boolean DEFAULT false NOT NULL,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text,
	"org_role" "org_role" DEFAULT 'OrgMember' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_account_org_email_unique" UNIQUE("org_id","email")
);
--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_instance" ADD CONSTRAINT "application_instance_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_instance" ADD CONSTRAINT "application_instance_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_instance" ADD CONSTRAINT "application_instance_created_by_user_account_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution" ADD CONSTRAINT "execution_sandbox_id_sandbox_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution" ADD CONSTRAINT "execution_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution" ADD CONSTRAINT "execution_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_connection" ADD CONSTRAINT "git_connection_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy" ADD CONSTRAINT "policy_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release" ADD CONSTRAINT "release_instance_id_application_instance_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."application_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release" ADD CONSTRAINT "release_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository" ADD CONSTRAINT "repository_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_binding" ADD CONSTRAINT "role_binding_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_binding" ADD CONSTRAINT "role_binding_user_id_user_account_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox" ADD CONSTRAINT "sandbox_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_instance_id_application_instance_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."application_instance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_origin_release_id_release_id_fk" FOREIGN KEY ("origin_release_id") REFERENCES "public"."release"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_check" ADD CONSTRAINT "task_check_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_check" ADD CONSTRAINT "task_check_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_check" ADD CONSTRAINT "task_check_release_id_release_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."release"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_check" ADD CONSTRAINT "task_check_execution_id_execution_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."execution"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_event" ADD CONSTRAINT "task_event_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_message" ADD CONSTRAINT "task_message_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_message" ADD CONSTRAINT "task_message_execution_id_execution_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."execution"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_message" ADD CONSTRAINT "task_message_replies_to_id_task_message_id_fk" FOREIGN KEY ("replies_to_id") REFERENCES "public"."task_message"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_account" ADD CONSTRAINT "user_account_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "application_instance_live_task_unique" ON "application_instance" USING btree ("task_id") WHERE task_id is not null and status <> 'torn_down';--> statement-breakpoint
CREATE INDEX "artifact_owner_idx" ON "artifact" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pull_request_task_unique" ON "pull_request" USING btree ("task_id") WHERE task_id is not null;--> statement-breakpoint
CREATE INDEX "release_instance_created_idx" ON "release" USING btree ("instance_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "task_application_phase_idx" ON "task" USING btree ("application_id","phase");--> statement-breakpoint
CREATE INDEX "task_needs_input_idx" ON "task" USING btree ("phase") WHERE phase = 'needs_input';--> statement-breakpoint
CREATE INDEX "task_check_task_ran_idx" ON "task_check" USING btree ("task_id","ran_at");--> statement-breakpoint
CREATE INDEX "task_event_task_at_idx" ON "task_event" USING btree ("task_id","at");--> statement-breakpoint
CREATE INDEX "task_message_task_created_idx" ON "task_message" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_message_open_blocking_idx" ON "task_message" USING btree ("task_id") WHERE blocking and answered_at is null;