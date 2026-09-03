CREATE TABLE "employee_planning_locations" (
  "employee_user_id" text PRIMARY KEY NOT NULL,
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "employee_planning_locations_employee_user_id_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "users"("id") ON DELETE restrict,
  CONSTRAINT "employee_planning_locations_coordinate_check" CHECK ("latitude" between -90 and 90 and "longitude" between -180 and 180),
  CONSTRAINT "employee_planning_locations_version_check" CHECK ("version" > 0)
);
