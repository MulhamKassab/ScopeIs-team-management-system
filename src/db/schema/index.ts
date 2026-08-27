import { relations, sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const systemRoleEnum = pgEnum("system_role", ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"]);
export const scopeTypeEnum = pgEnum("scope_type", ["TEAM", "CLIENT", "PROJECT", "LOCATION"]);
export const authenticationModeEnum = pgEnum("authentication_mode", ["mock"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  role: systemRoleEnum("role").notNull(),
  active: boolean("active").notNull().default(true),
  sessionVersion: integer("session_version").notNull().default(1),
  version: integer("version").notNull().default(1),
  ...timestamps,
});

export const adminScopeGrants = pgTable("admin_scope_grants", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scopeType: scopeTypeEnum("scope_type").notNull(),
  scopeReference: text("scope_reference").notNull(),
  active: boolean("active").notNull().default(true),
  version: integer("version").notNull().default(1),
  ...timestamps,
}, (table) => [
  uniqueIndex("admin_scope_grants_unique").on(table.userId, table.scopeType, table.scopeReference),
  index("admin_scope_grants_user_active_idx").on(table.userId, table.active),
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  authenticationMode: authenticationModeEnum("authentication_mode").notNull().default("mock"),
  sessionVersion: integer("session_version").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [uniqueIndex("sessions_token_hash_unique").on(table.tokenHash), index("sessions_user_active_idx").on(table.userId, table.expiresAt)]);

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  actorRole: systemRoleEnum("actor_role"),
  authenticationMode: authenticationModeEnum("authentication_mode").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  metadata: jsonb("metadata").notNull().default({}),
  correlationId: uuid("correlation_id").defaultRandom().notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("audit_events_actor_occurred_idx").on(table.actorUserId, table.occurredAt)]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipientUserId: text("recipient_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  relatedRecordType: text("related_record_type"),
  relatedRecordId: text("related_record_id"),
  readAt: timestamp("read_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("notifications_recipient_unread_idx").on(table.recipientUserId, table.readAt)]);

export const userRelations = relations(users, ({ many }) => ({ sessions: many(sessions), scopeGrants: many(adminScopeGrants) }));
export const sessionRelations = relations(sessions, ({ one }) => ({ user: one(users, { fields: [sessions.userId], references: [users.id] }) }));

export const foundationChecks = check("users_session_version_positive", sql`${users.sessionVersion} > 0`);
