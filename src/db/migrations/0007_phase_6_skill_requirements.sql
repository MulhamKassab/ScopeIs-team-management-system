CREATE TABLE "assignment_skill_requirements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "schedule_assignment_id" uuid NOT NULL REFERENCES "schedule_assignments"("id") ON DELETE RESTRICT,
  "skill_id" uuid NOT NULL REFERENCES "skills"("id") ON DELETE RESTRICT,
  "archived_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "assignment_skill_requirements_version_check" CHECK ("version" > 0),
  CONSTRAINT "assignment_skill_requirements_assignment_skill_key" UNIQUE ("schedule_assignment_id", "skill_id")
);
CREATE INDEX "assignment_skill_requirements_assignment_idx" ON "assignment_skill_requirements" ("schedule_assignment_id", "archived_at");
CREATE INDEX "assignment_skill_requirements_skill_idx" ON "assignment_skill_requirements" ("skill_id", "archived_at");
