CREATE TYPE "system_role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'EMPLOYEE');
CREATE TYPE "scope_type" AS ENUM ('TEAM', 'CLIENT', 'PROJECT', 'LOCATION');
CREATE TYPE "authentication_mode" AS ENUM ('mock');

CREATE TABLE "users" (
  "id" text PRIMARY KEY NOT NULL,
  "display_name" text NOT NULL,
  "role" "system_role" NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "session_version" integer DEFAULT 1 NOT NULL CHECK ("session_version" > 0),
  "version" integer DEFAULT 1 NOT NULL CHECK ("version" > 0),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "admin_scope_grants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "scope_type" "scope_type" NOT NULL,
  "scope_reference" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "version" integer DEFAULT 1 NOT NULL CHECK ("version" > 0),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "admin_scope_grants_unique" UNIQUE("user_id", "scope_type", "scope_reference")
);

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL UNIQUE,
  "authentication_mode" "authentication_mode" DEFAULT 'mock' NOT NULL,
  "session_version" integer NOT NULL CHECK ("session_version" > 0),
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" text REFERENCES "users"("id") ON DELETE set null,
  "actor_role" "system_role",
  "authentication_mode" "authentication_mode" NOT NULL,
  "action" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "correlation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipient_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "event_type" text NOT NULL,
  "related_record_type" text,
  "related_record_id" text,
  "read_at" timestamp with time zone,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "admin_scope_grants_user_active_idx" ON "admin_scope_grants" USING btree ("user_id", "active");
CREATE INDEX "sessions_user_active_idx" ON "sessions" USING btree ("user_id", "expires_at");
CREATE INDEX "audit_events_actor_occurred_idx" ON "audit_events" USING btree ("actor_user_id", "occurred_at");
CREATE INDEX "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_user_id", "read_at");
