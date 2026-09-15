-- Phase 10 collaboration and governance: note revision history, request discussions, and inbox/audit indexes.
CREATE TABLE "operational_note_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"edited_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operational_note_revisions_note_version_unique" UNIQUE("note_id","version"),
	CONSTRAINT "operational_note_revisions_version_check" CHECK ("version" > 0)
);
ALTER TABLE "operational_note_revisions" ADD CONSTRAINT "operational_note_revisions_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "operational_notes"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "operational_note_revisions" ADD CONSTRAINT "operational_note_revisions_edited_by_user_id_fkey" FOREIGN KEY ("edited_by_user_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE no action;
CREATE INDEX "operational_note_revisions_note_idx" ON "operational_note_revisions" USING btree ("note_id","version");

CREATE TABLE "discussion_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_type" text NOT NULL,
	"parent_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discussion_threads_parent_unique" UNIQUE("parent_type","parent_id"),
	CONSTRAINT "discussion_threads_parent_type_check" CHECK ("parent_type" = 'replacement_request')
);
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "replacement_requests"("id") ON DELETE restrict ON UPDATE no action;

CREATE TABLE "discussion_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_user_id" text NOT NULL,
	"content" text NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by_user_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discussion_messages_content_length_check" CHECK (char_length("content") between 1 and 2000),
	CONSTRAINT "discussion_messages_version_check" CHECK ("version" > 0)
);
ALTER TABLE "discussion_messages" ADD CONSTRAINT "discussion_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "discussion_threads"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "discussion_messages" ADD CONSTRAINT "discussion_messages_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "discussion_messages" ADD CONSTRAINT "discussion_messages_archived_by_user_id_fkey" FOREIGN KEY ("archived_by_user_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE no action;
CREATE INDEX "discussion_messages_thread_created_idx" ON "discussion_messages" USING btree ("thread_id","created_at","id");

CREATE INDEX "notifications_recipient_created_idx" ON "notifications" USING btree ("recipient_user_id","created_at","id");
CREATE INDEX "audit_events_occurred_idx" ON "audit_events" USING btree ("occurred_at","id");
CREATE INDEX "audit_events_target_idx" ON "audit_events" USING btree ("target_type","target_id");
