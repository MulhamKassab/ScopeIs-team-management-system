-- Phase 2 manual-QA remediation: a single transaction-locked counter for the bounded prototype code range 0001–9999.
CREATE TABLE "employee_code_sequence" (
  "singleton" boolean PRIMARY KEY DEFAULT true NOT NULL,
  "next_value" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "employee_code_sequence_singleton_check" CHECK ("singleton" = true),
  CONSTRAINT "employee_code_sequence_next_value_check" CHECK ("next_value" BETWEEN 1 AND 10000)
);
INSERT INTO "employee_code_sequence" ("singleton", "next_value") VALUES (true, 1);
