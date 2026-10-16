CREATE TABLE "client_bookings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL,
  "employee_user_id" text NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "note" text,
  "created_by_user_id" text NOT NULL,
  "cancelled_at" timestamp with time zone,
  "cancelled_by_user_id" text,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "client_bookings_client_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict,
  CONSTRAINT "client_bookings_employee_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "public"."users"("id") ON DELETE restrict,
  CONSTRAINT "client_bookings_creator_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict,
  CONSTRAINT "client_bookings_canceller_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict,
  CONSTRAINT "client_bookings_dates_check" CHECK ("end_date" >= "start_date" and "end_date" - "start_date" < 366),
  CONSTRAINT "client_bookings_note_check" CHECK ("note" is null or char_length("note") <= 1000),
  CONSTRAINT "client_bookings_version_check" CHECK ("version" > 0)
);
--> statement-breakpoint
CREATE INDEX "client_bookings_employee_dates_idx" ON "client_bookings" USING btree ("employee_user_id", "start_date", "end_date") WHERE "cancelled_at" is null;
--> statement-breakpoint
CREATE INDEX "client_bookings_client_idx" ON "client_bookings" USING btree ("client_id");
