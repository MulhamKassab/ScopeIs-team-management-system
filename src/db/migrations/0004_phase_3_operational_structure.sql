CREATE TYPE "operational_lifecycle_status" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "project_status" AS ENUM ('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');

CREATE TABLE "clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_name" text NOT NULL,
  "status" "operational_lifecycle_status" DEFAULT 'ACTIVE' NOT NULL,
  "account_manager_user_id" text REFERENCES "users"("id") ON DELETE RESTRICT,
  "service_summary" text,
  "service_start_date" date,
  "service_end_date" date,
  "version" integer DEFAULT 1 NOT NULL CHECK ("version" > 0),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "clients_service_dates_check" CHECK ("service_end_date" IS NULL OR "service_start_date" IS NULL OR "service_end_date" >= "service_start_date")
);

CREATE TABLE "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE RESTRICT,
  "name" text NOT NULL,
  "status" "project_status" DEFAULT 'PLANNED' NOT NULL,
  "responsible_admin_user_id" text REFERENCES "users"("id") ON DELETE RESTRICT,
  "start_date" date,
  "end_date" date,
  "version" integer DEFAULT 1 NOT NULL CHECK ("version" > 0),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "projects_client_name_key" UNIQUE("client_id", "name"),
  CONSTRAINT "projects_dates_check" CHECK ("end_date" IS NULL OR "start_date" IS NULL OR "end_date" >= "start_date")
);

CREATE TABLE "locations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE RESTRICT,
  "name" text NOT NULL,
  "address" text NOT NULL,
  "status" "operational_lifecycle_status" DEFAULT 'ACTIVE' NOT NULL,
  "latitude" double precision,
  "longitude" double precision,
  "site_hours" text,
  "access_instructions" text,
  "visit_requirements" text,
  "version" integer DEFAULT 1 NOT NULL CHECK ("version" > 0),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "locations_coordinate_pair_check" CHECK (("latitude" IS NULL AND "longitude" IS NULL) OR ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180))
);

CREATE TABLE "project_locations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE RESTRICT,
  "location_id" uuid NOT NULL REFERENCES "locations"("id") ON DELETE RESTRICT,
  "archived_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL CHECK ("version" > 0),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "project_locations_project_location_key" UNIQUE("project_id", "location_id")
);

CREATE TABLE "operational_contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid REFERENCES "clients"("id") ON DELETE RESTRICT,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE RESTRICT,
  "location_id" uuid REFERENCES "locations"("id") ON DELETE RESTRICT,
  "name" text NOT NULL,
  "role_title" text,
  "work_phone" text,
  "work_email" text,
  "archived_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL CHECK ("version" > 0),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "operational_contacts_one_parent_check" CHECK (num_nonnulls("client_id", "project_id", "location_id") = 1)
);

CREATE TABLE "staffing_requirements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid REFERENCES "clients"("id") ON DELETE RESTRICT,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE RESTRICT,
  "location_id" uuid REFERENCES "locations"("id") ON DELETE RESTRICT,
  "required_skill_id" uuid NOT NULL REFERENCES "skills"("id") ON DELETE RESTRICT,
  "required_employee_count" integer NOT NULL,
  "note" text,
  "archived_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL CHECK ("version" > 0),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "staffing_requirements_one_parent_check" CHECK (num_nonnulls("client_id", "project_id", "location_id") = 1),
  CONSTRAINT "staffing_requirements_count_check" CHECK ("required_employee_count" > 0)
);

CREATE TABLE "operational_employee_relations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid REFERENCES "clients"("id") ON DELETE RESTRICT,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE RESTRICT,
  "location_id" uuid REFERENCES "locations"("id") ON DELETE RESTRICT,
  "employee_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "archived_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL CHECK ("version" > 0),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "operational_employee_relations_client_key" UNIQUE("client_id", "employee_user_id"),
  CONSTRAINT "operational_employee_relations_project_key" UNIQUE("project_id", "employee_user_id"),
  CONSTRAINT "operational_employee_relations_location_key" UNIQUE("location_id", "employee_user_id"),
  CONSTRAINT "operational_employee_relations_one_parent_check" CHECK (num_nonnulls("client_id", "project_id", "location_id") = 1)
);

CREATE TABLE "operational_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid REFERENCES "clients"("id") ON DELETE RESTRICT,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE RESTRICT,
  "location_id" uuid REFERENCES "locations"("id") ON DELETE RESTRICT,
  "author_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "content" text NOT NULL,
  "archived_at" timestamptz,
  "archived_by_user_id" text REFERENCES "users"("id") ON DELETE RESTRICT,
  "archive_reason" text,
  "version" integer DEFAULT 1 NOT NULL CHECK ("version" > 0),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "operational_notes_one_parent_check" CHECK (num_nonnulls("client_id", "project_id", "location_id") = 1),
  CONSTRAINT "operational_notes_archive_fields_check" CHECK (("archived_at" IS NULL AND "archived_by_user_id" IS NULL AND "archive_reason" IS NULL) OR ("archived_at" IS NOT NULL AND "archived_by_user_id" IS NOT NULL AND char_length("archive_reason") > 0))
);

CREATE INDEX "clients_status_name_idx" ON "clients" ("status", "company_name");
CREATE INDEX "projects_client_status_idx" ON "projects" ("client_id", "status");
CREATE INDEX "locations_client_status_name_idx" ON "locations" ("client_id", "status", "name");
CREATE INDEX "project_locations_location_idx" ON "project_locations" ("location_id", "archived_at");
CREATE INDEX "operational_contacts_client_idx" ON "operational_contacts" ("client_id", "archived_at");
CREATE INDEX "operational_contacts_project_idx" ON "operational_contacts" ("project_id", "archived_at");
CREATE INDEX "operational_contacts_location_idx" ON "operational_contacts" ("location_id", "archived_at");
CREATE INDEX "staffing_requirements_client_idx" ON "staffing_requirements" ("client_id", "archived_at");
CREATE INDEX "staffing_requirements_project_idx" ON "staffing_requirements" ("project_id", "archived_at");
CREATE INDEX "staffing_requirements_location_idx" ON "staffing_requirements" ("location_id", "archived_at");
CREATE INDEX "operational_employee_relations_employee_idx" ON "operational_employee_relations" ("employee_user_id", "archived_at");
CREATE INDEX "operational_notes_client_idx" ON "operational_notes" ("client_id", "archived_at");
CREATE INDEX "operational_notes_project_idx" ON "operational_notes" ("project_id", "archived_at");
CREATE INDEX "operational_notes_location_idx" ON "operational_notes" ("location_id", "archived_at");
