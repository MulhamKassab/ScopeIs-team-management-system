DO $$ BEGIN
  CREATE TYPE "public"."replacement_request_intent" AS ENUM('REPLACE_ASSIGNMENT', 'ADD_COVERAGE_ASSIGNMENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."replacement_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."replacement_effect_status" AS ENUM('PENDING', 'APPLIED_TO_DRAFT', 'PUBLISHED_REVISION_CREATED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE "replacement_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "intent" "replacement_request_intent" NOT NULL,
  "status" "replacement_request_status" DEFAULT 'PENDING' NOT NULL,
  "effect_status" "replacement_effect_status" DEFAULT 'PENDING' NOT NULL,
  "staffing_requirement_id" uuid,
  "anchor_assignment_id" uuid NOT NULL,
  "requester_user_id" text NOT NULL,
  "nominated_employee_user_id" text,
  "selected_employee_user_id" text,
  "observed_required_employee_count" integer NOT NULL,
  "observed_eligible_employee_count" integer NOT NULL,
  "decided_by_user_id" text,
  "decided_at" timestamp with time zone,
  "effect_schedule_period_id" uuid,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "replacement_requests_staffing_requirement_id_fkey" FOREIGN KEY ("staffing_requirement_id") REFERENCES "staffing_requirements"("id") ON DELETE restrict,
  CONSTRAINT "replacement_requests_anchor_assignment_id_fkey" FOREIGN KEY ("anchor_assignment_id") REFERENCES "schedule_assignments"("id") ON DELETE restrict,
  CONSTRAINT "replacement_requests_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE restrict,
  CONSTRAINT "replacement_requests_nominated_employee_user_id_fkey" FOREIGN KEY ("nominated_employee_user_id") REFERENCES "users"("id") ON DELETE restrict,
  CONSTRAINT "replacement_requests_selected_employee_user_id_fkey" FOREIGN KEY ("selected_employee_user_id") REFERENCES "users"("id") ON DELETE restrict,
  CONSTRAINT "replacement_requests_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "users"("id") ON DELETE restrict,
  CONSTRAINT "replacement_requests_effect_schedule_period_id_fkey" FOREIGN KEY ("effect_schedule_period_id") REFERENCES "schedule_periods"("id") ON DELETE restrict,
  CONSTRAINT "replacement_requests_required_count_check" CHECK ("observed_required_employee_count" > 0),
  CONSTRAINT "replacement_requests_eligible_count_check" CHECK ("observed_eligible_employee_count" >= 0),
  CONSTRAINT "replacement_requests_version_check" CHECK ("version" > 0)
);
CREATE INDEX "replacement_requests_status_created_idx" ON "replacement_requests" USING btree ("status","created_at");
CREATE INDEX "replacement_requests_requester_status_idx" ON "replacement_requests" USING btree ("requester_user_id","status");
CREATE INDEX "replacement_requests_anchor_status_idx" ON "replacement_requests" USING btree ("anchor_assignment_id","status");
