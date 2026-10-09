import { sql } from "drizzle-orm";
import { boolean, check, date, foreignKey, index, integer, pgEnum, pgTable, serial, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { clients, projects, users } from "./index";

export const ticketBoardStatusEnum = pgEnum("ticket_board_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["PLANNED", "OPEN", "IN_PROGRESS", "ON_HOLD", "CLOSED"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export const ticketParticipantRoleEnum = pgEnum("ticket_participant_role", ["ASSIGNEE", "OBSERVER"]);
const timestamps = { createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() };

/** Independent Company containers. Links confer no access to management records or scheduling effects. */
export const ticketWorkspaces = pgTable("ticket_workspaces", {
  id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(), description: text("description"),
  clientId: uuid("client_id"), projectId: uuid("project_id"), createdByUserId: text("created_by_user_id").notNull(),
  version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "ticket_workspaces_client_fkey", columns: [table.clientId], foreignColumns: [clients.id] }).onDelete("restrict"),
  foreignKey({ name: "ticket_workspaces_project_fkey", columns: [table.projectId], foreignColumns: [projects.id] }).onDelete("restrict"),
  foreignKey({ name: "ticket_workspaces_creator_fkey", columns: [table.createdByUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  check("ticket_workspaces_name_check", sql`char_length(btrim(${table.name})) between 1 and 120`),
  check("ticket_workspaces_description_check", sql`${table.description} is null or char_length(${table.description}) <= 1000`),
  check("ticket_workspaces_version_check", sql`${table.version} > 0`),
]);
export const ticketWorkspaceMembers = pgTable("ticket_workspace_members", {
  id: uuid("id").defaultRandom().primaryKey(), workspaceId: uuid("workspace_id").notNull(), userId: text("user_id").notNull(),
  active: boolean("active").notNull().default(true), grantedByUserId: text("granted_by_user_id").notNull(), ...timestamps,
}, (table) => [
  foreignKey({ name: "ticket_workspace_members_workspace_fkey", columns: [table.workspaceId], foreignColumns: [ticketWorkspaces.id] }).onDelete("restrict"),
  foreignKey({ name: "ticket_workspace_members_user_fkey", columns: [table.userId], foreignColumns: [users.id] }).onDelete("restrict"),
  foreignKey({ name: "ticket_workspace_members_granter_fkey", columns: [table.grantedByUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  unique("ticket_workspace_members_unique").on(table.workspaceId, table.userId), index("ticket_workspace_members_user_active_idx").on(table.userId, table.active),
]);
export const ticketBoards = pgTable("ticket_boards", {
  id: uuid("id").defaultRandom().primaryKey(), workspaceId: uuid("workspace_id").notNull(), name: text("name").notNull(),
  status: ticketBoardStatusEnum("status").notNull().default("DRAFT"), createdByUserId: text("created_by_user_id").notNull(),
  version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "ticket_boards_workspace_fkey", columns: [table.workspaceId], foreignColumns: [ticketWorkspaces.id] }).onDelete("restrict"),
  foreignKey({ name: "ticket_boards_creator_fkey", columns: [table.createdByUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  index("ticket_boards_workspace_status_idx").on(table.workspaceId, table.status),
  check("ticket_boards_name_check", sql`char_length(btrim(${table.name})) between 1 and 120`), check("ticket_boards_version_check", sql`${table.version} > 0`),
]);
export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(), number: serial("number").notNull(), boardId: uuid("board_id").notNull(),
  subject: text("subject").notNull(), status: ticketStatusEnum("status").notNull().default("OPEN"), priority: ticketPriorityEnum("priority").notNull().default("MEDIUM"),
  ticketDate: date("ticket_date").notNull(), dueDate: date("due_date"), summary: text("summary"), planning: text("planning"), workCompleted: text("work_completed"), notes: text("notes"), onHoldReason: text("on_hold_reason"),
  creatorUserId: text("creator_user_id").notNull(), archivedAt: timestamp("archived_at", { withTimezone: true }), archivedByUserId: text("archived_by_user_id"),
  version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "tickets_board_fkey", columns: [table.boardId], foreignColumns: [ticketBoards.id] }).onDelete("restrict"),
  foreignKey({ name: "tickets_creator_fkey", columns: [table.creatorUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  foreignKey({ name: "tickets_archiver_fkey", columns: [table.archivedByUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  unique("tickets_number_unique").on(table.number), index("tickets_board_status_idx").on(table.boardId, table.status), index("tickets_creator_idx").on(table.creatorUserId),
  check("tickets_subject_check", sql`char_length(btrim(${table.subject})) between 1 and 200`),
  check("tickets_content_check", sql`(${table.summary} is null or char_length(${table.summary}) <= 10000) and (${table.planning} is null or char_length(${table.planning}) <= 10000) and (${table.workCompleted} is null or char_length(${table.workCompleted}) <= 10000) and (${table.notes} is null or char_length(${table.notes}) <= 10000)`),
  check("tickets_hold_reason_check", sql`${table.status} <> 'ON_HOLD' or char_length(btrim(coalesce(${table.onHoldReason}, ''))) between 1 and 2000`),
  check("tickets_version_check", sql`${table.version} > 0`),
]);
export const ticketParticipants = pgTable("ticket_participants", {
  id: uuid("id").defaultRandom().primaryKey(), ticketId: uuid("ticket_id").notNull(), userId: text("user_id").notNull(),
  role: ticketParticipantRoleEnum("role").notNull(), active: boolean("active").notNull().default(true), grantedByUserId: text("granted_by_user_id").notNull(), ...timestamps,
}, (table) => [
  foreignKey({ name: "ticket_participants_ticket_fkey", columns: [table.ticketId], foreignColumns: [tickets.id] }).onDelete("restrict"),
  foreignKey({ name: "ticket_participants_user_fkey", columns: [table.userId], foreignColumns: [users.id] }).onDelete("restrict"),
  foreignKey({ name: "ticket_participants_granter_fkey", columns: [table.grantedByUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  unique("ticket_participants_unique").on(table.ticketId, table.userId), index("ticket_participants_user_active_idx").on(table.userId, table.active),
]);
export const ticketWorkLogs = pgTable("ticket_work_logs", {
  id: uuid("id").defaultRandom().primaryKey(), ticketId: uuid("ticket_id").notNull(), authorUserId: text("author_user_id").notNull(), description: text("description").notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(), durationMinutes: integer("duration_minutes"), version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "ticket_work_logs_ticket_fkey", columns: [table.ticketId], foreignColumns: [tickets.id] }).onDelete("restrict"),
  foreignKey({ name: "ticket_work_logs_author_fkey", columns: [table.authorUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  check("ticket_work_logs_description_check", sql`char_length(btrim(${table.description})) between 1 and 5000`),
  check("ticket_work_logs_duration_check", sql`${table.durationMinutes} is null or ${table.durationMinutes} between 1 and 1440`), check("ticket_work_logs_version_check", sql`${table.version} > 0`), index("ticket_work_logs_ticket_date_idx").on(table.ticketId, table.loggedAt),
]);
export const ticketFiles = pgTable("ticket_files", {
  id: uuid("id").defaultRandom().primaryKey(), ticketId: uuid("ticket_id").notNull(), ownerUserId: text("owner_user_id").notNull(), uploaderUserId: text("uploader_user_id").notNull(),
  fileName: text("file_name").notNull(), contentType: text("content_type").notNull(), byteSize: integer("byte_size").notNull(), storageKey: text("storage_key").notNull(),
  version: integer("version").notNull().default(1), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }), archivedByUserId: text("archived_by_user_id"),
}, (table) => [
  foreignKey({ name: "ticket_files_ticket_fkey", columns: [table.ticketId], foreignColumns: [tickets.id] }).onDelete("restrict"),
  foreignKey({ name: "ticket_files_owner_fkey", columns: [table.ownerUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  foreignKey({ name: "ticket_files_uploader_fkey", columns: [table.uploaderUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  foreignKey({ name: "ticket_files_archiver_fkey", columns: [table.archivedByUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  unique("ticket_files_storage_key_unique").on(table.storageKey), index("ticket_files_ticket_idx").on(table.ticketId, table.createdAt),
  check("ticket_files_name_check", sql`char_length(btrim(${table.fileName})) between 1 and 180`),
  check("ticket_files_type_check", sql`char_length(${table.contentType}) between 1 and 120`), check("ticket_files_size_check", sql`${table.byteSize} between 1 and 10485760`), check("ticket_files_version_check", sql`${table.version} > 0`),
]);
