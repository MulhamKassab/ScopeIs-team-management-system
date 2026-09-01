-- Phase 2.7: a bounded informational label only; it does not model shifts, leave, attendance, or availability.
ALTER TABLE "employee_profiles" ADD COLUMN "working_pattern" text;
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_working_pattern_length_check" CHECK ("working_pattern" IS NULL OR char_length("working_pattern") <= 120);
