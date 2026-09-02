CREATE TYPE "schedule_period_status" AS ENUM ('DRAFT', 'PROPOSED', 'PUBLISHED');

CREATE TABLE "schedule_periods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE RESTRICT,
  "planning_month" date NOT NULL,
  "lineage_id" uuid NOT NULL,
  "revision_number" integer DEFAULT 1 NOT NULL,
  "parent_period_id" uuid REFERENCES "schedule_periods"("id") ON DELETE RESTRICT,
  "status" "schedule_period_status" DEFAULT 'DRAFT' NOT NULL,
  "is_current" boolean DEFAULT false NOT NULL,
  "last_return_reason" text,
  "proposed_at" timestamptz,
  "published_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "schedule_periods_revision_key" UNIQUE("client_id", "planning_month", "revision_number"),
  CONSTRAINT "schedule_periods_month_first_day_check" CHECK (extract(day from "planning_month") = 1),
  CONSTRAINT "schedule_periods_revision_check" CHECK ("revision_number" > 0),
  CONSTRAINT "schedule_periods_version_check" CHECK ("version" > 0),
  CONSTRAINT "schedule_periods_current_only_published_check" CHECK ("is_current" = false OR "status" = 'PUBLISHED')
);

CREATE TABLE "schedule_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "schedule_period_id" uuid NOT NULL CONSTRAINT "schedule_assignments_period_id_fkey" REFERENCES "schedule_periods"("id") ON DELETE RESTRICT,
  "employee_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE RESTRICT,
  "location_id" uuid NOT NULL REFERENCES "locations"("id") ON DELETE RESTRICT,
  "assignment_date" date NOT NULL,
  "start_time" time(0) NOT NULL,
  "end_time" time(0) NOT NULL,
  "shared_instruction" text,
  "copied_from_assignment_id" uuid CONSTRAINT "schedule_assignments_copied_from_fkey" REFERENCES "schedule_assignments"("id") ON DELETE RESTRICT,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "schedule_assignments_time_order_check" CHECK ("end_time" > "start_time"),
  CONSTRAINT "schedule_assignments_instruction_length_check" CHECK ("shared_instruction" IS NULL OR char_length("shared_instruction") <= 500),
  CONSTRAINT "schedule_assignments_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "schedule_periods_active_draft_proposed_key"
  ON "schedule_periods" ("client_id", "planning_month")
  WHERE "status" IN ('DRAFT', 'PROPOSED');
CREATE UNIQUE INDEX "schedule_periods_current_published_key"
  ON "schedule_periods" ("client_id", "planning_month")
  WHERE "status" = 'PUBLISHED' AND "is_current" = true;
CREATE INDEX "schedule_periods_client_month_idx" ON "schedule_periods" ("client_id", "planning_month", "status");
CREATE INDEX "schedule_periods_lineage_idx" ON "schedule_periods" ("lineage_id", "status");
CREATE INDEX "schedule_assignments_employee_date_idx" ON "schedule_assignments" ("employee_user_id", "assignment_date");
CREATE INDEX "schedule_assignments_period_idx" ON "schedule_assignments" ("schedule_period_id", "assignment_date");
CREATE INDEX "schedule_assignments_project_location_idx" ON "schedule_assignments" ("project_id", "location_id");
