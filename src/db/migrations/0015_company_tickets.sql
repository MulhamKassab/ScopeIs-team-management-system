CREATE TYPE "public"."ticket_board_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."ticket_participant_role" AS ENUM('ASSIGNEE', 'OBSERVER');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('PLANNED', 'OPEN', 'IN_PROGRESS', 'ON_HOLD', 'CLOSED');--> statement-breakpoint
CREATE TABLE "ticket_boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "ticket_board_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_boards_name_check" CHECK (char_length(btrim("ticket_boards"."name")) between 1 and 120),
	CONSTRAINT "ticket_boards_version_check" CHECK ("ticket_boards"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ticket_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"owner_user_id" text NOT NULL,
	"uploader_user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"storage_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by_user_id" text,
	CONSTRAINT "ticket_files_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "ticket_files_name_check" CHECK (char_length(btrim("ticket_files"."file_name")) between 1 and 180),
	CONSTRAINT "ticket_files_type_check" CHECK (char_length("ticket_files"."content_type") between 1 and 120),
	CONSTRAINT "ticket_files_size_check" CHECK ("ticket_files"."byte_size" between 1 and 10485760),
	CONSTRAINT "ticket_files_version_check" CHECK ("ticket_files"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ticket_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "ticket_participant_role" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"granted_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_participants_unique" UNIQUE("ticket_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "ticket_work_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_user_id" text NOT NULL,
	"description" text NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_minutes" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_work_logs_description_check" CHECK (char_length(btrim("ticket_work_logs"."description")) between 1 and 5000),
	CONSTRAINT "ticket_work_logs_duration_check" CHECK ("ticket_work_logs"."duration_minutes" is null or "ticket_work_logs"."duration_minutes" between 1 and 1440),
	CONSTRAINT "ticket_work_logs_version_check" CHECK ("ticket_work_logs"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ticket_workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"granted_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_workspace_members_unique" UNIQUE("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "ticket_workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"client_id" uuid,
	"project_id" uuid,
	"created_by_user_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_workspaces_name_check" CHECK (char_length(btrim("ticket_workspaces"."name")) between 1 and 120),
	CONSTRAINT "ticket_workspaces_description_check" CHECK ("ticket_workspaces"."description" is null or char_length("ticket_workspaces"."description") <= 1000),
	CONSTRAINT "ticket_workspaces_version_check" CHECK ("ticket_workspaces"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" serial NOT NULL,
	"board_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"status" "ticket_status" DEFAULT 'OPEN' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'MEDIUM' NOT NULL,
	"ticket_date" date NOT NULL,
	"due_date" date,
	"summary" text,
	"planning" text,
	"work_completed" text,
	"notes" text,
	"on_hold_reason" text,
	"creator_user_id" text NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by_user_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_number_unique" UNIQUE("number"),
	CONSTRAINT "tickets_subject_check" CHECK (char_length(btrim("tickets"."subject")) between 1 and 200),
	CONSTRAINT "tickets_content_check" CHECK (("tickets"."summary" is null or char_length("tickets"."summary") <= 10000) and ("tickets"."planning" is null or char_length("tickets"."planning") <= 10000) and ("tickets"."work_completed" is null or char_length("tickets"."work_completed") <= 10000) and ("tickets"."notes" is null or char_length("tickets"."notes") <= 10000)),
	CONSTRAINT "tickets_hold_reason_check" CHECK ("tickets"."status" <> 'ON_HOLD' or char_length(btrim(coalesce("tickets"."on_hold_reason", ''))) between 1 and 2000),
	CONSTRAINT "tickets_version_check" CHECK ("tickets"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "ticket_boards" ADD CONSTRAINT "ticket_boards_workspace_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."ticket_workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_boards" ADD CONSTRAINT "ticket_boards_creator_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_files" ADD CONSTRAINT "ticket_files_ticket_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_files" ADD CONSTRAINT "ticket_files_owner_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_files" ADD CONSTRAINT "ticket_files_uploader_fkey" FOREIGN KEY ("uploader_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_files" ADD CONSTRAINT "ticket_files_archiver_fkey" FOREIGN KEY ("archived_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_ticket_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_user_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_granter_fkey" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_work_logs" ADD CONSTRAINT "ticket_work_logs_ticket_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_work_logs" ADD CONSTRAINT "ticket_work_logs_author_fkey" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_workspace_members" ADD CONSTRAINT "ticket_workspace_members_workspace_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."ticket_workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_workspace_members" ADD CONSTRAINT "ticket_workspace_members_user_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_workspace_members" ADD CONSTRAINT "ticket_workspace_members_granter_fkey" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_workspaces" ADD CONSTRAINT "ticket_workspaces_client_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_workspaces" ADD CONSTRAINT "ticket_workspaces_project_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_workspaces" ADD CONSTRAINT "ticket_workspaces_creator_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_board_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."ticket_boards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_creator_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_archiver_fkey" FOREIGN KEY ("archived_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_boards_workspace_status_idx" ON "ticket_boards" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "ticket_files_ticket_idx" ON "ticket_files" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "ticket_participants_user_active_idx" ON "ticket_participants" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "ticket_work_logs_ticket_date_idx" ON "ticket_work_logs" USING btree ("ticket_id","logged_at");--> statement-breakpoint
CREATE INDEX "ticket_workspace_members_user_active_idx" ON "ticket_workspace_members" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "tickets_board_status_idx" ON "tickets" USING btree ("board_id","status");--> statement-breakpoint
CREATE INDEX "tickets_creator_idx" ON "tickets" USING btree ("creator_user_id");