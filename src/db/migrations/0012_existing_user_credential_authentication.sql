ALTER TYPE "authentication_mode" ADD VALUE 'password';
--> statement-breakpoint
CREATE TABLE "user_credentials" (
  "user_id" text PRIMARY KEY NOT NULL,
  "username" text NOT NULL,
  "normalized_username" text NOT NULL,
  "email" text NOT NULL,
  "normalized_email" text NOT NULL,
  "password_hash" text NOT NULL,
  "password_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "failed_attempt_count" integer DEFAULT 0 NOT NULL,
  "failure_window_started_at" timestamp with time zone,
  "locked_until" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade,
  CONSTRAINT "user_credentials_username_check" CHECK (char_length("username") between 1 and 80 and "normalized_username" = lower(btrim("username")) and "normalized_username" ~ '^[a-z0-9._-]+$'),
  CONSTRAINT "user_credentials_email_check" CHECK (char_length("email") between 3 and 254 and "normalized_email" = lower(btrim("email")) and position('@' in "normalized_email") > 1),
  CONSTRAINT "user_credentials_hash_check" CHECK (char_length("password_hash") between 100 and 256),
  CONSTRAINT "user_credentials_failures_check" CHECK ("failed_attempt_count" between 0 and 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_credentials_username_unique" ON "user_credentials" USING btree ("normalized_username");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_credentials_email_unique" ON "user_credentials" USING btree ("normalized_email");
