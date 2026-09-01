import { relations, sql } from "drizzle-orm";
import { boolean, check, date, foreignKey, index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const systemRoleEnum = pgEnum("system_role", ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"]);
export const scopeTypeEnum = pgEnum("scope_type", ["TEAM", "CLIENT", "PROJECT", "LOCATION"]);
export const authenticationModeEnum = pgEnum("authentication_mode", ["mock"]);
export const evidenceReviewStateEnum = pgEnum("evidence_review_state", ["unreviewed", "reviewed", "verified"]);
export const evidenceKindEnum = pgEnum("evidence_kind", ["certification", "cv", "portfolio", "project_example", "supporting_document"]);
export const noteVisibilityEnum = pgEnum("note_visibility", ["private_to_author", "shared_upward"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: text("id").primaryKey(), displayName: text("display_name").notNull(), role: systemRoleEnum("role").notNull(),
  active: boolean("active").notNull().default(true), sessionVersion: integer("session_version").notNull().default(1),
  version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [check("users_session_version_check", sql`${table.sessionVersion} > 0`), check("users_version_check", sql`${table.version} > 0`)]);

export const adminScopeGrants = pgTable("admin_scope_grants", {
  id: uuid("id").defaultRandom().primaryKey(), userId: text("user_id").notNull(),
  scopeType: scopeTypeEnum("scope_type").notNull(), scopeReference: text("scope_reference").notNull(), active: boolean("active").notNull().default(true),
  version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [foreignKey({ name: "admin_scope_grants_user_id_fkey", columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"), unique("admin_scope_grants_unique").on(table.userId, table.scopeType, table.scopeReference), index("admin_scope_grants_user_active_idx").on(table.userId, table.active), check("admin_scope_grants_version_check", sql`${table.version} > 0`)]);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(), userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull(), authenticationMode: authenticationModeEnum("authentication_mode").notNull().default("mock"),
  sessionVersion: integer("session_version").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }), ...timestamps,
}, (table) => [foreignKey({ name: "sessions_user_id_fkey", columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"), unique("sessions_token_hash_key").on(table.tokenHash), index("sessions_user_active_idx").on(table.userId, table.expiresAt), check("sessions_session_version_check", sql`${table.sessionVersion} > 0`)]);

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(), actorUserId: text("actor_user_id"),
  actorRole: systemRoleEnum("actor_role"), authenticationMode: authenticationModeEnum("authentication_mode").notNull(), action: text("action").notNull(),
  targetType: text("target_type").notNull(), targetId: text("target_id"), metadata: jsonb("metadata").notNull().default({}),
  correlationId: uuid("correlation_id").defaultRandom().notNull(), occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [foreignKey({ name: "audit_events_actor_user_id_fkey", columns: [table.actorUserId], foreignColumns: [users.id] }).onDelete("set null"), index("audit_events_actor_occurred_idx").on(table.actorUserId, table.occurredAt)]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(), recipientUserId: text("recipient_user_id").notNull(),
  eventType: text("event_type").notNull(), relatedRecordType: text("related_record_type"), relatedRecordId: text("related_record_id"),
  readAt: timestamp("read_at", { withTimezone: true }), archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [foreignKey({ name: "notifications_recipient_user_id_fkey", columns: [table.recipientUserId], foreignColumns: [users.id] }).onDelete("cascade"), index("notifications_recipient_unread_idx").on(table.recipientUserId, table.readAt)]);

export const designations = pgTable("designations", {
  id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(), sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true), archivedAt: timestamp("archived_at", { withTimezone: true }), version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [unique("designations_name_key").on(table.name), check("designations_version_check", sql`${table.version} > 0`)]);

export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(), active: boolean("active").notNull().default(true),
  archivedAt: timestamp("archived_at", { withTimezone: true }), version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [unique("skills_name_key").on(table.name), check("skills_version_check", sql`${table.version} > 0`)]);

export const arrangementLabels = pgTable("arrangement_labels", {
  id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(), color: text("color").notNull(), sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true), archivedAt: timestamp("archived_at", { withTimezone: true }), version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [unique("arrangement_labels_name_key").on(table.name), check("arrangement_labels_version_check", sql`${table.version} > 0`)]);

export const employeeProfiles = pgTable("employee_profiles", {
  userId: text("user_id").primaryKey(), employeeCode: text("employee_code").notNull(),
  workEmail: text("work_email"), workPhone: text("work_phone"), professionalSummary: text("professional_summary"),
  designationId: uuid("designation_id"), team: text("team"), managerUserId: text("manager_user_id"), defaultWorkLocation: text("default_work_location"),
  version: integer("version").notNull().default(1), ...timestamps,
  // Informational only: Phase 2 deliberately does not introduce scheduling or availability logic.
  workingPattern: text("working_pattern"),
}, (table) => [foreignKey({ name: "employee_profiles_user_id_fkey", columns: [table.userId], foreignColumns: [users.id] }).onDelete("restrict"), foreignKey({ name: "employee_profiles_designation_id_fkey", columns: [table.designationId], foreignColumns: [designations.id] }).onDelete("restrict"), foreignKey({ name: "employee_profiles_manager_user_id_fkey", columns: [table.managerUserId], foreignColumns: [users.id] }).onDelete("restrict"), unique("employee_profiles_employee_code_key").on(table.employeeCode), index("employee_profiles_team_idx").on(table.team), check("employee_profiles_version_check", sql`${table.version} > 0`), check("employee_profiles_working_pattern_length_check", sql`${table.workingPattern} is null or char_length(${table.workingPattern}) <= 120`)]);

export const employeeSkills = pgTable("employee_skills", {
  id: uuid("id").defaultRandom().primaryKey(), employeeUserId: text("employee_user_id").notNull(), skillId: uuid("skill_id").notNull(), proficiencyDescription: text("proficiency_description"),
  experienceDescription: text("experience_description"), notes: text("notes"), coverageEligible: boolean("coverage_eligible"),
  verified: boolean("verified").notNull().default(false), archivedAt: timestamp("archived_at", { withTimezone: true }), version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [foreignKey({ name: "employee_skills_employee_user_id_fkey", columns: [table.employeeUserId], foreignColumns: [users.id] }).onDelete("restrict"), foreignKey({ name: "employee_skills_skill_id_fkey", columns: [table.skillId], foreignColumns: [skills.id] }).onDelete("restrict"), unique("employee_skills_employee_user_id_skill_id_key").on(table.employeeUserId, table.skillId), index("employee_skills_employee_idx").on(table.employeeUserId), check("employee_skills_version_check", sql`${table.version} > 0`)]);

export const employeeEvidence = pgTable("employee_evidence", {
  id: uuid("id").defaultRandom().primaryKey(), ownerUserId: text("owner_user_id").notNull(), uploaderUserId: text("uploader_user_id").notNull(), kind: evidenceKindEnum("kind").notNull(),
  title: text("title").notNull(), issuer: text("issuer"), issueDate: date("issue_date"), expiryDate: date("expiry_date"),
  relatedSkillId: uuid("related_skill_id"), externalUrl: text("external_url"), reviewState: evidenceReviewStateEnum("review_state").notNull().default("unreviewed"), reviewedByUserId: text("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }), archivedAt: timestamp("archived_at", { withTimezone: true }), version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [foreignKey({ name: "employee_evidence_owner_user_id_fkey", columns: [table.ownerUserId], foreignColumns: [users.id] }).onDelete("restrict"), foreignKey({ name: "employee_evidence_uploader_user_id_fkey", columns: [table.uploaderUserId], foreignColumns: [users.id] }).onDelete("restrict"), foreignKey({ name: "employee_evidence_related_skill_id_fkey", columns: [table.relatedSkillId], foreignColumns: [skills.id] }).onDelete("restrict"), foreignKey({ name: "employee_evidence_reviewed_by_user_id_fkey", columns: [table.reviewedByUserId], foreignColumns: [users.id] }).onDelete("restrict"), index("employee_evidence_owner_idx").on(table.ownerUserId, table.archivedAt), check("employee_evidence_version_check", sql`${table.version} > 0`), check("employee_evidence_check", sql`${table.expiryDate} is null or ${table.issueDate} is null or ${table.expiryDate} >= ${table.issueDate}`)]);

export const employeeFiles = pgTable("employee_files", {
  id: uuid("id").defaultRandom().primaryKey(), evidenceId: uuid("evidence_id").notNull(), ownerUserId: text("owner_user_id").notNull(), storageKey: text("storage_key").notNull(),
  originalFilename: text("original_filename").notNull(), contentType: text("content_type").notNull(), sizeBytes: integer("size_bytes").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [foreignKey({ name: "employee_files_evidence_id_fkey", columns: [table.evidenceId], foreignColumns: [employeeEvidence.id] }).onDelete("restrict"), foreignKey({ name: "employee_files_owner_user_id_fkey", columns: [table.ownerUserId], foreignColumns: [users.id] }).onDelete("restrict"), unique("employee_files_storage_key_key").on(table.storageKey), index("employee_files_evidence_idx").on(table.evidenceId), check("employee_files_size_bytes_check", sql`${table.sizeBytes} > 0`)]);

export const employeeManagementNotes = pgTable("employee_management_notes", {
  id: uuid("id").defaultRandom().primaryKey(), subjectUserId: text("subject_user_id").notNull(), authorUserId: text("author_user_id").notNull(), authorRole: systemRoleEnum("author_role").notNull(),
  visibility: noteVisibilityEnum("visibility").notNull(), content: text("content").notNull(), archivedAt: timestamp("archived_at", { withTimezone: true }),
  version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [foreignKey({ name: "employee_management_notes_subject_user_id_fkey", columns: [table.subjectUserId], foreignColumns: [users.id] }).onDelete("restrict"), foreignKey({ name: "employee_management_notes_author_user_id_fkey", columns: [table.authorUserId], foreignColumns: [users.id] }).onDelete("restrict"), index("employee_management_notes_subject_idx").on(table.subjectUserId, table.archivedAt), check("employee_management_notes_version_check", sql`${table.version} > 0`)]);

export const userRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions), scopeGrants: many(adminScopeGrants),
  employeeProfile: one(employeeProfiles, { fields: [users.id], references: [employeeProfiles.userId], relationName: "employeeProfileUser" }),
  managedProfiles: many(employeeProfiles, { relationName: "employeeProfileManager" }), employeeSkills: many(employeeSkills),
  ownedEvidence: many(employeeEvidence, { relationName: "evidenceOwner" }), uploadedEvidence: many(employeeEvidence, { relationName: "evidenceUploader" }),
  reviewedEvidence: many(employeeEvidence, { relationName: "evidenceReviewer" }), ownedFiles: many(employeeFiles),
  authoredManagementNotes: many(employeeManagementNotes, { relationName: "managementNoteAuthor" }), subjectManagementNotes: many(employeeManagementNotes, { relationName: "managementNoteSubject" }),
}));
export const sessionRelations = relations(sessions, ({ one }) => ({ user: one(users, { fields: [sessions.userId], references: [users.id] }) }));
export const designationRelations = relations(designations, ({ many }) => ({ employeeProfiles: many(employeeProfiles) }));
export const skillRelations = relations(skills, ({ many }) => ({ employeeSkills: many(employeeSkills), evidence: many(employeeEvidence) }));
export const employeeProfileRelations = relations(employeeProfiles, ({ one }) => ({
  user: one(users, { fields: [employeeProfiles.userId], references: [users.id], relationName: "employeeProfileUser" }),
  manager: one(users, { fields: [employeeProfiles.managerUserId], references: [users.id], relationName: "employeeProfileManager" }),
  designation: one(designations, { fields: [employeeProfiles.designationId], references: [designations.id] }),
}));
export const employeeSkillRelations = relations(employeeSkills, ({ one }) => ({ employee: one(users, { fields: [employeeSkills.employeeUserId], references: [users.id] }), skill: one(skills, { fields: [employeeSkills.skillId], references: [skills.id] }) }));
export const employeeEvidenceRelations = relations(employeeEvidence, ({ many, one }) => ({
  owner: one(users, { fields: [employeeEvidence.ownerUserId], references: [users.id], relationName: "evidenceOwner" }),
  uploader: one(users, { fields: [employeeEvidence.uploaderUserId], references: [users.id], relationName: "evidenceUploader" }),
  reviewer: one(users, { fields: [employeeEvidence.reviewedByUserId], references: [users.id], relationName: "evidenceReviewer" }),
  relatedSkill: one(skills, { fields: [employeeEvidence.relatedSkillId], references: [skills.id] }), files: many(employeeFiles),
}));
export const employeeFileRelations = relations(employeeFiles, ({ one }) => ({ evidence: one(employeeEvidence, { fields: [employeeFiles.evidenceId], references: [employeeEvidence.id] }), owner: one(users, { fields: [employeeFiles.ownerUserId], references: [users.id] }) }));
export const employeeManagementNoteRelations = relations(employeeManagementNotes, ({ one }) => ({
  subject: one(users, { fields: [employeeManagementNotes.subjectUserId], references: [users.id], relationName: "managementNoteSubject" }),
  author: one(users, { fields: [employeeManagementNotes.authorUserId], references: [users.id], relationName: "managementNoteAuthor" }),
}));
