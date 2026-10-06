CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_reference_check" CHECK ("teams"."id" ~ '^team:[a-zA-Z0-9][a-zA-Z0-9:_-]{0,118}$'),
	CONSTRAINT "teams_name_check" CHECK (char_length(btrim("teams"."name")) between 1 and 120),
	CONSTRAINT "teams_version_check" CHECK ("teams"."version" > 0)
);
--> statement-breakpoint
INSERT INTO "teams" ("id", "name")
SELECT reference, left(initcap(replace(replace(replace(substring(reference from 6), '-', ' '), '_', ' '), ':', ' ')), 120)
FROM (SELECT team AS reference FROM employee_profiles WHERE team IS NOT NULL
      UNION SELECT scope_reference FROM admin_scope_grants WHERE scope_type = 'TEAM') existing
ON CONFLICT (id) DO NOTHING;
