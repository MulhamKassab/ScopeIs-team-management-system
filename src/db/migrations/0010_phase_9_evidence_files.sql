-- Phase 9 capability evidence: additive provenance, review queue, idempotency, and file versioning.
ALTER TABLE "employee_evidence" ADD COLUMN "last_submitted_at" timestamp with time zone;
ALTER TABLE "employee_evidence" ADD COLUMN "submission_key" text;
ALTER TABLE "employee_evidence" ADD COLUMN "verified_by_user_id" text;
ALTER TABLE "employee_evidence" ADD COLUMN "verified_at" timestamp with time zone;
ALTER TABLE "employee_evidence" ADD COLUMN "details" text;
ALTER TABLE "employee_evidence" ADD CONSTRAINT "employee_evidence_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE no action;
CREATE INDEX "employee_evidence_review_idx" ON "employee_evidence" USING btree ("review_state","last_submitted_at");
CREATE UNIQUE INDEX "employee_evidence_submission_key_unique" ON "employee_evidence" USING btree ("owner_user_id","submission_key") WHERE "submission_key" is not null;
CREATE UNIQUE INDEX "employee_evidence_active_cv_unique" ON "employee_evidence" USING btree ("owner_user_id") WHERE "kind" = 'cv' and "archived_at" is null;

ALTER TABLE "employee_files" ADD COLUMN "uploader_user_id" text;
ALTER TABLE "employee_files" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "employee_files" ADD CONSTRAINT "employee_files_uploader_user_id_fkey" FOREIGN KEY ("uploader_user_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE no action;
CREATE INDEX "employee_files_evidence_active_idx" ON "employee_files" USING btree ("evidence_id","archived_at");
CREATE UNIQUE INDEX "employee_files_active_version_unique" ON "employee_files" USING btree ("evidence_id","version") WHERE "archived_at" is null;
ALTER TABLE "employee_files" ADD CONSTRAINT "employee_files_version_check" CHECK ("version" > 0);
