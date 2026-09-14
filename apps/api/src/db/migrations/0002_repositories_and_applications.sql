ALTER TABLE "application" ADD COLUMN "validation_error" text;--> statement-breakpoint
ALTER TABLE "repository" ADD COLUMN "connection_id" uuid;--> statement-breakpoint
UPDATE "repository" SET "connection_id" = (SELECT "git_connection"."id" FROM "git_connection" WHERE "git_connection"."org_id" = "repository"."org_id" ORDER BY "git_connection"."created_at" LIMIT 1);--> statement-breakpoint
ALTER TABLE "repository" ALTER COLUMN "connection_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "repository" ADD CONSTRAINT "repository_connection_id_git_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."git_connection"("id") ON DELETE restrict ON UPDATE no action;
