import { relations, sql } from "drizzle-orm";
import { boolean, check, date, doublePrecision, foreignKey, index, integer, jsonb, pgEnum, pgTable, text, time, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const systemRoleEnum = pgEnum("system_role", ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"]);
export const scopeTypeEnum = pgEnum("scope_type", ["TEAM", "CLIENT", "PROJECT", "LOCATION"]);
export const authenticationModeEnum = pgEnum("authentication_mode", ["mock"]);
export const evidenceReviewStateEnum = pgEnum("evidence_review_state", ["unreviewed", "reviewed", "verified"]);
export const evidenceKindEnum = pgEnum("evidence_kind", ["certification", "cv", "portfolio", "project_example", "supporting_document"]);
export const noteVisibilityEnum = pgEnum("note_visibility", ["private_to_author", "shared_upward"]);
export const operationalLifecycleStatusEnum = pgEnum("operational_lifecycle_status", ["ACTIVE", "ARCHIVED"]);
export const projectStatusEnum = pgEnum("project_status", ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]);
export const schedulePeriodStatusEnum = pgEnum("schedule_period_status", ["DRAFT", "PROPOSED", "PUBLISHED"]);
export const leaveRequestStatusEnum = pgEnum("leave_request_status", ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]);
export const replacementRequestIntentEnum = pgEnum("replacement_request_intent", ["REPLACE_ASSIGNMENT", "ADD_COVERAGE_ASSIGNMENT"]);
export const replacementRequestStatusEnum = pgEnum("replacement_request_status", ["PENDING", "APPROVED", "REJECTED"]);
export const replacementEffectStatusEnum = pgEnum("replacement_effect_status", ["PENDING", "APPLIED_TO_DRAFT", "PUBLISHED_REVISION_CREATED"]);

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

/** Exact employee planning coordinates are protected source data. Map reads project a coarse marker for scoped Admins. */
export const employeePlanningLocations = pgTable("employee_planning_locations", {
  employeeUserId: text("employee_user_id").primaryKey(), latitude: doublePrecision("latitude").notNull(), longitude: doublePrecision("longitude").notNull(),
  version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "employee_planning_locations_employee_user_id_fkey", columns: [table.employeeUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  check("employee_planning_locations_coordinate_check", sql`${table.latitude} between -90 and 90 and ${table.longitude} between -180 and 180`),
  check("employee_planning_locations_version_check", sql`${table.version} > 0`),
]);

/** One locked row allocates temporary Phase 2 employee codes without browser input or COUNT/MAX races. */
export const employeeCodeSequence = pgTable("employee_code_sequence", {
  singleton: boolean("singleton").primaryKey().notNull().default(true),
  nextValue: integer("next_value").notNull().default(1),
}, (table) => [check("employee_code_sequence_singleton_check", sql`${table.singleton} = true`), check("employee_code_sequence_next_value_check", sql`${table.nextValue} between 1 and 10000`)]);

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

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(), companyName: text("company_name").notNull(), status: operationalLifecycleStatusEnum("status").notNull().default("ACTIVE"),
  accountManagerUserId: text("account_manager_user_id"), serviceSummary: text("service_summary"), serviceStartDate: date("service_start_date"), serviceEndDate: date("service_end_date"),
  version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "clients_account_manager_user_id_fkey", columns: [table.accountManagerUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  index("clients_status_name_idx").on(table.status, table.companyName), check("clients_version_check", sql`${table.version} > 0`),
  check("clients_service_dates_check", sql`${table.serviceEndDate} is null or ${table.serviceStartDate} is null or ${table.serviceEndDate} >= ${table.serviceStartDate}`),
]);

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(), clientId: uuid("client_id").notNull(), name: text("name").notNull(), status: projectStatusEnum("status").notNull().default("PLANNED"),
  responsibleAdminUserId: text("responsible_admin_user_id"), startDate: date("start_date"), endDate: date("end_date"), version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "projects_client_id_fkey", columns: [table.clientId], foreignColumns: [clients.id] }).onDelete("restrict"),
  foreignKey({ name: "projects_responsible_admin_user_id_fkey", columns: [table.responsibleAdminUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  unique("projects_client_name_key").on(table.clientId, table.name), index("projects_client_status_idx").on(table.clientId, table.status),
  check("projects_version_check", sql`${table.version} > 0`), check("projects_dates_check", sql`${table.endDate} is null or ${table.startDate} is null or ${table.endDate} >= ${table.startDate}`),
]);

export const locations = pgTable("locations", {
  id: uuid("id").defaultRandom().primaryKey(), clientId: uuid("client_id").notNull(), name: text("name").notNull(), address: text("address").notNull(),
  status: operationalLifecycleStatusEnum("status").notNull().default("ACTIVE"), latitude: doublePrecision("latitude"), longitude: doublePrecision("longitude"),
  siteHours: text("site_hours"), accessInstructions: text("access_instructions"), visitRequirements: text("visit_requirements"), version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "locations_client_id_fkey", columns: [table.clientId], foreignColumns: [clients.id] }).onDelete("restrict"),
  index("locations_client_status_name_idx").on(table.clientId, table.status, table.name), check("locations_version_check", sql`${table.version} > 0`),
  check("locations_coordinate_pair_check", sql`(${table.latitude} is null and ${table.longitude} is null) or (${table.latitude} between -90 and 90 and ${table.longitude} between -180 and 180)`),
]);

export const projectLocations = pgTable("project_locations", {
  id: uuid("id").defaultRandom().primaryKey(), projectId: uuid("project_id").notNull(), locationId: uuid("location_id").notNull(), archivedAt: timestamp("archived_at", { withTimezone: true }),
  version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "project_locations_project_id_fkey", columns: [table.projectId], foreignColumns: [projects.id] }).onDelete("restrict"),
  foreignKey({ name: "project_locations_location_id_fkey", columns: [table.locationId], foreignColumns: [locations.id] }).onDelete("restrict"),
  unique("project_locations_project_location_key").on(table.projectId, table.locationId), index("project_locations_location_idx").on(table.locationId, table.archivedAt),
  check("project_locations_version_check", sql`${table.version} > 0`),
]);

export const operationalContacts = pgTable("operational_contacts", {
  id: uuid("id").defaultRandom().primaryKey(), clientId: uuid("client_id"), projectId: uuid("project_id"), locationId: uuid("location_id"),
  name: text("name").notNull(), roleTitle: text("role_title"), workPhone: text("work_phone"), workEmail: text("work_email"), archivedAt: timestamp("archived_at", { withTimezone: true }),
  version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "operational_contacts_client_id_fkey", columns: [table.clientId], foreignColumns: [clients.id] }).onDelete("restrict"),
  foreignKey({ name: "operational_contacts_project_id_fkey", columns: [table.projectId], foreignColumns: [projects.id] }).onDelete("restrict"),
  foreignKey({ name: "operational_contacts_location_id_fkey", columns: [table.locationId], foreignColumns: [locations.id] }).onDelete("restrict"),
  index("operational_contacts_client_idx").on(table.clientId, table.archivedAt), index("operational_contacts_project_idx").on(table.projectId, table.archivedAt), index("operational_contacts_location_idx").on(table.locationId, table.archivedAt),
  check("operational_contacts_one_parent_check", sql`num_nonnulls(${table.clientId}, ${table.projectId}, ${table.locationId}) = 1`), check("operational_contacts_version_check", sql`${table.version} > 0`),
]);

export const staffingRequirements = pgTable("staffing_requirements", {
  id: uuid("id").defaultRandom().primaryKey(), clientId: uuid("client_id"), projectId: uuid("project_id"), locationId: uuid("location_id"), requiredSkillId: uuid("required_skill_id").notNull(),
  requiredEmployeeCount: integer("required_employee_count").notNull(), note: text("note"), archivedAt: timestamp("archived_at", { withTimezone: true }), version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "staffing_requirements_client_id_fkey", columns: [table.clientId], foreignColumns: [clients.id] }).onDelete("restrict"),
  foreignKey({ name: "staffing_requirements_project_id_fkey", columns: [table.projectId], foreignColumns: [projects.id] }).onDelete("restrict"),
  foreignKey({ name: "staffing_requirements_location_id_fkey", columns: [table.locationId], foreignColumns: [locations.id] }).onDelete("restrict"),
  foreignKey({ name: "staffing_requirements_required_skill_id_fkey", columns: [table.requiredSkillId], foreignColumns: [skills.id] }).onDelete("restrict"),
  index("staffing_requirements_client_idx").on(table.clientId, table.archivedAt), index("staffing_requirements_project_idx").on(table.projectId, table.archivedAt), index("staffing_requirements_location_idx").on(table.locationId, table.archivedAt),
  check("staffing_requirements_one_parent_check", sql`num_nonnulls(${table.clientId}, ${table.projectId}, ${table.locationId}) = 1`), check("staffing_requirements_count_check", sql`${table.requiredEmployeeCount} > 0`), check("staffing_requirements_version_check", sql`${table.version} > 0`),
]);

export const operationalEmployeeRelations = pgTable("operational_employee_relations", {
  id: uuid("id").defaultRandom().primaryKey(), clientId: uuid("client_id"), projectId: uuid("project_id"), locationId: uuid("location_id"), employeeUserId: text("employee_user_id").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }), version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "operational_employee_relations_client_id_fkey", columns: [table.clientId], foreignColumns: [clients.id] }).onDelete("restrict"),
  foreignKey({ name: "operational_employee_relations_project_id_fkey", columns: [table.projectId], foreignColumns: [projects.id] }).onDelete("restrict"),
  foreignKey({ name: "operational_employee_relations_location_id_fkey", columns: [table.locationId], foreignColumns: [locations.id] }).onDelete("restrict"),
  foreignKey({ name: "operational_employee_relations_employee_user_id_fkey", columns: [table.employeeUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  unique("operational_employee_relations_client_key").on(table.clientId, table.employeeUserId), unique("operational_employee_relations_project_key").on(table.projectId, table.employeeUserId), unique("operational_employee_relations_location_key").on(table.locationId, table.employeeUserId),
  index("operational_employee_relations_employee_idx").on(table.employeeUserId, table.archivedAt), check("operational_employee_relations_one_parent_check", sql`num_nonnulls(${table.clientId}, ${table.projectId}, ${table.locationId}) = 1`), check("operational_employee_relations_version_check", sql`${table.version} > 0`),
]);

export const operationalNotes = pgTable("operational_notes", {
  id: uuid("id").defaultRandom().primaryKey(), clientId: uuid("client_id"), projectId: uuid("project_id"), locationId: uuid("location_id"), authorUserId: text("author_user_id").notNull(),
  content: text("content").notNull(), archivedAt: timestamp("archived_at", { withTimezone: true }), archivedByUserId: text("archived_by_user_id"), archiveReason: text("archive_reason"),
  version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "operational_notes_client_id_fkey", columns: [table.clientId], foreignColumns: [clients.id] }).onDelete("restrict"),
  foreignKey({ name: "operational_notes_project_id_fkey", columns: [table.projectId], foreignColumns: [projects.id] }).onDelete("restrict"),
  foreignKey({ name: "operational_notes_location_id_fkey", columns: [table.locationId], foreignColumns: [locations.id] }).onDelete("restrict"),
  foreignKey({ name: "operational_notes_author_user_id_fkey", columns: [table.authorUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  foreignKey({ name: "operational_notes_archived_by_user_id_fkey", columns: [table.archivedByUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  index("operational_notes_client_idx").on(table.clientId, table.archivedAt), index("operational_notes_project_idx").on(table.projectId, table.archivedAt), index("operational_notes_location_idx").on(table.locationId, table.archivedAt),
  check("operational_notes_one_parent_check", sql`num_nonnulls(${table.clientId}, ${table.projectId}, ${table.locationId}) = 1`), check("operational_notes_version_check", sql`${table.version} > 0`),
  check("operational_notes_archive_fields_check", sql`(${table.archivedAt} is null and ${table.archivedByUserId} is null and ${table.archiveReason} is null) or (${table.archivedAt} is not null and ${table.archivedByUserId} is not null and char_length(${table.archiveReason}) > 0)`),
]);

export const schedulePeriods = pgTable("schedule_periods", {
  id: uuid("id").defaultRandom().primaryKey(), clientId: uuid("client_id").notNull(), planningMonth: date("planning_month").notNull(),
  lineageId: uuid("lineage_id").notNull(), revisionNumber: integer("revision_number").notNull().default(1), parentPeriodId: uuid("parent_period_id"),
  status: schedulePeriodStatusEnum("status").notNull().default("DRAFT"), isCurrent: boolean("is_current").notNull().default(false), lastReturnReason: text("last_return_reason"),
  proposedAt: timestamp("proposed_at", { withTimezone: true }), publishedAt: timestamp("published_at", { withTimezone: true }), version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "schedule_periods_client_id_fkey", columns: [table.clientId], foreignColumns: [clients.id] }).onDelete("restrict"),
  foreignKey({ name: "schedule_periods_parent_period_id_fkey", columns: [table.parentPeriodId], foreignColumns: [table.id] }).onDelete("restrict"),
  unique("schedule_periods_revision_key").on(table.clientId, table.planningMonth, table.revisionNumber), uniqueIndex("schedule_periods_active_draft_proposed_key").on(table.clientId, table.planningMonth).where(sql`${table.status} in ('DRAFT', 'PROPOSED')`), uniqueIndex("schedule_periods_current_published_key").on(table.clientId, table.planningMonth).where(sql`${table.status} = 'PUBLISHED' and ${table.isCurrent} = true`), index("schedule_periods_client_month_idx").on(table.clientId, table.planningMonth, table.status), index("schedule_periods_lineage_idx").on(table.lineageId, table.status),
  check("schedule_periods_month_first_day_check", sql`extract(day from ${table.planningMonth}) = 1`), check("schedule_periods_revision_check", sql`${table.revisionNumber} > 0`), check("schedule_periods_version_check", sql`${table.version} > 0`), check("schedule_periods_current_only_published_check", sql`${table.isCurrent} = false or ${table.status} = 'PUBLISHED'`),
]);

export const scheduleAssignments = pgTable("schedule_assignments", {
  id: uuid("id").defaultRandom().primaryKey(), schedulePeriodId: uuid("schedule_period_id").notNull(), employeeUserId: text("employee_user_id").notNull(),
  projectId: uuid("project_id").notNull(), locationId: uuid("location_id").notNull(), assignmentDate: date("assignment_date").notNull(),
  startTime: time("start_time", { precision: 0 }).notNull(), endTime: time("end_time", { precision: 0 }).notNull(), sharedInstruction: text("shared_instruction"), copiedFromAssignmentId: uuid("copied_from_assignment_id"),
  version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "schedule_assignments_period_id_fkey", columns: [table.schedulePeriodId], foreignColumns: [schedulePeriods.id] }).onDelete("restrict"),
  foreignKey({ name: "schedule_assignments_employee_user_id_fkey", columns: [table.employeeUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  foreignKey({ name: "schedule_assignments_project_id_fkey", columns: [table.projectId], foreignColumns: [projects.id] }).onDelete("restrict"),
  foreignKey({ name: "schedule_assignments_location_id_fkey", columns: [table.locationId], foreignColumns: [locations.id] }).onDelete("restrict"),
  foreignKey({ name: "schedule_assignments_copied_from_fkey", columns: [table.copiedFromAssignmentId], foreignColumns: [table.id] }).onDelete("restrict"),
  index("schedule_assignments_employee_date_idx").on(table.employeeUserId, table.assignmentDate), index("schedule_assignments_period_idx").on(table.schedulePeriodId, table.assignmentDate), index("schedule_assignments_project_location_idx").on(table.projectId, table.locationId),
  check("schedule_assignments_time_order_check", sql`${table.endTime} > ${table.startTime}`), check("schedule_assignments_instruction_length_check", sql`${table.sharedInstruction} is null or char_length(${table.sharedInstruction}) <= 500`), check("schedule_assignments_version_check", sql`${table.version} > 0`),
]);

export const assignmentSkillRequirements = pgTable("assignment_skill_requirements", {
  id: uuid("id").defaultRandom().primaryKey(), scheduleAssignmentId: uuid("schedule_assignment_id").notNull(), skillId: uuid("skill_id").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }), version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "assignment_skill_requirements_schedule_assignment_id_fkey", columns: [table.scheduleAssignmentId], foreignColumns: [scheduleAssignments.id] }).onDelete("restrict"),
  foreignKey({ name: "assignment_skill_requirements_skill_id_fkey", columns: [table.skillId], foreignColumns: [skills.id] }).onDelete("restrict"),
  unique("assignment_skill_requirements_assignment_skill_key").on(table.scheduleAssignmentId, table.skillId), index("assignment_skill_requirements_assignment_idx").on(table.scheduleAssignmentId, table.archivedAt), index("assignment_skill_requirements_skill_idx").on(table.skillId, table.archivedAt),
  check("assignment_skill_requirements_version_check", sql`${table.version} > 0`),
]);

export const leaveAllowanceSettings = pgTable("leave_allowance_settings", {
  singleton: boolean("singleton").primaryKey().notNull().default(true), annualWorkingDays: integer("annual_working_days").notNull().default(22), version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [check("leave_allowance_settings_singleton_check", sql`${table.singleton} = true`), check("leave_allowance_settings_days_check", sql`${table.annualWorkingDays} between 1 and 366`), check("leave_allowance_settings_version_check", sql`${table.version} > 0`)]);

export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").defaultRandom().primaryKey(), employeeUserId: text("employee_user_id").notNull(), startDate: date("start_date").notNull(), endDate: date("end_date").notNull(), status: leaveRequestStatusEnum("status").notNull().default("PENDING"),
  privateReason: text("private_reason"), decisionResponse: text("decision_response"), reviewedByUserId: text("reviewed_by_user_id"), decidedAt: timestamp("decided_at", { withTimezone: true }), cancelledAt: timestamp("cancelled_at", { withTimezone: true }), version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [foreignKey({ name: "leave_requests_employee_user_id_fkey", columns: [table.employeeUserId], foreignColumns: [users.id] }).onDelete("restrict"), foreignKey({ name: "leave_requests_reviewed_by_user_id_fkey", columns: [table.reviewedByUserId], foreignColumns: [users.id] }).onDelete("restrict"), index("leave_requests_employee_status_dates_idx").on(table.employeeUserId, table.status, table.startDate, table.endDate), index("leave_requests_status_created_idx").on(table.status, table.createdAt), check("leave_requests_date_order_check", sql`${table.endDate} >= ${table.startDate}`), check("leave_requests_private_reason_length_check", sql`${table.privateReason} is null or char_length(${table.privateReason}) <= 1000`), check("leave_requests_response_length_check", sql`${table.decisionResponse} is null or char_length(${table.decisionResponse}) <= 1000`), check("leave_requests_version_check", sql`${table.version} > 0`)]);

/** Phase 7 records the review decision separately from its non-published schedule effect. */
export const replacementRequests = pgTable("replacement_requests", {
  id: uuid("id").defaultRandom().primaryKey(), intent: replacementRequestIntentEnum("intent").notNull(), status: replacementRequestStatusEnum("status").notNull().default("PENDING"), effectStatus: replacementEffectStatusEnum("effect_status").notNull().default("PENDING"),
  staffingRequirementId: uuid("staffing_requirement_id"), anchorAssignmentId: uuid("anchor_assignment_id").notNull(), requesterUserId: text("requester_user_id").notNull(), nominatedEmployeeUserId: text("nominated_employee_user_id"), selectedEmployeeUserId: text("selected_employee_user_id"),
  observedRequiredEmployeeCount: integer("observed_required_employee_count").notNull(), observedEligibleEmployeeCount: integer("observed_eligible_employee_count").notNull(), decidedByUserId: text("decided_by_user_id"), decidedAt: timestamp("decided_at", { withTimezone: true }), effectSchedulePeriodId: uuid("effect_schedule_period_id"), version: integer("version").notNull().default(1), ...timestamps,
}, (table) => [
  foreignKey({ name: "replacement_requests_staffing_requirement_id_fkey", columns: [table.staffingRequirementId], foreignColumns: [staffingRequirements.id] }).onDelete("restrict"), foreignKey({ name: "replacement_requests_anchor_assignment_id_fkey", columns: [table.anchorAssignmentId], foreignColumns: [scheduleAssignments.id] }).onDelete("restrict"), foreignKey({ name: "replacement_requests_requester_user_id_fkey", columns: [table.requesterUserId], foreignColumns: [users.id] }).onDelete("restrict"), foreignKey({ name: "replacement_requests_nominated_employee_user_id_fkey", columns: [table.nominatedEmployeeUserId], foreignColumns: [users.id] }).onDelete("restrict"), foreignKey({ name: "replacement_requests_selected_employee_user_id_fkey", columns: [table.selectedEmployeeUserId], foreignColumns: [users.id] }).onDelete("restrict"), foreignKey({ name: "replacement_requests_decided_by_user_id_fkey", columns: [table.decidedByUserId], foreignColumns: [users.id] }).onDelete("restrict"), foreignKey({ name: "replacement_requests_effect_schedule_period_id_fkey", columns: [table.effectSchedulePeriodId], foreignColumns: [schedulePeriods.id] }).onDelete("restrict"),
  index("replacement_requests_status_created_idx").on(table.status, table.createdAt), index("replacement_requests_requester_status_idx").on(table.requesterUserId, table.status), index("replacement_requests_anchor_status_idx").on(table.anchorAssignmentId, table.status), check("replacement_requests_required_count_check", sql`${table.observedRequiredEmployeeCount} > 0`), check("replacement_requests_eligible_count_check", sql`${table.observedEligibleEmployeeCount} >= 0`), check("replacement_requests_version_check", sql`${table.version} > 0`),
]);

export const userRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions), scopeGrants: many(adminScopeGrants),
  employeeProfile: one(employeeProfiles, { fields: [users.id], references: [employeeProfiles.userId], relationName: "employeeProfileUser" }),
  managedProfiles: many(employeeProfiles, { relationName: "employeeProfileManager" }), employeeSkills: many(employeeSkills),
  ownedEvidence: many(employeeEvidence, { relationName: "evidenceOwner" }), uploadedEvidence: many(employeeEvidence, { relationName: "evidenceUploader" }),
  reviewedEvidence: many(employeeEvidence, { relationName: "evidenceReviewer" }), ownedFiles: many(employeeFiles),
  authoredManagementNotes: many(employeeManagementNotes, { relationName: "managementNoteAuthor" }), subjectManagementNotes: many(employeeManagementNotes, { relationName: "managementNoteSubject" }),
  requestedReplacementRequests: many(replacementRequests, { relationName: "replacementRequester" }), nominatedReplacementRequests: many(replacementRequests, { relationName: "replacementNominee" }), selectedReplacementRequests: many(replacementRequests, { relationName: "replacementSelected" }), decidedReplacementRequests: many(replacementRequests, { relationName: "replacementDecider" }),
}));
export const sessionRelations = relations(sessions, ({ one }) => ({ user: one(users, { fields: [sessions.userId], references: [users.id] }) }));
export const designationRelations = relations(designations, ({ many }) => ({ employeeProfiles: many(employeeProfiles) }));
export const skillRelations = relations(skills, ({ many }) => ({ employeeSkills: many(employeeSkills), evidence: many(employeeEvidence), assignmentRequirements: many(assignmentSkillRequirements) }));
export const employeeProfileRelations = relations(employeeProfiles, ({ one }) => ({
  user: one(users, { fields: [employeeProfiles.userId], references: [users.id], relationName: "employeeProfileUser" }),
  manager: one(users, { fields: [employeeProfiles.managerUserId], references: [users.id], relationName: "employeeProfileManager" }),
  designation: one(designations, { fields: [employeeProfiles.designationId], references: [designations.id] }),
}));
export const employeePlanningLocationRelations = relations(employeePlanningLocations, ({ one }) => ({ employee: one(users, { fields: [employeePlanningLocations.employeeUserId], references: [users.id] }) }));
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
export const replacementRequestRelations = relations(replacementRequests, ({ one }) => ({
  staffingRequirement: one(staffingRequirements, { fields: [replacementRequests.staffingRequirementId], references: [staffingRequirements.id] }),
  anchorAssignment: one(scheduleAssignments, { fields: [replacementRequests.anchorAssignmentId], references: [scheduleAssignments.id] }),
  requester: one(users, { fields: [replacementRequests.requesterUserId], references: [users.id], relationName: "replacementRequester" }),
  nominee: one(users, { fields: [replacementRequests.nominatedEmployeeUserId], references: [users.id], relationName: "replacementNominee" }),
  selected: one(users, { fields: [replacementRequests.selectedEmployeeUserId], references: [users.id], relationName: "replacementSelected" }),
  decider: one(users, { fields: [replacementRequests.decidedByUserId], references: [users.id], relationName: "replacementDecider" }),
  effectPeriod: one(schedulePeriods, { fields: [replacementRequests.effectSchedulePeriodId], references: [schedulePeriods.id] }),
}));
export const clientRelations = relations(clients, ({ many, one }) => ({
  accountManager: one(users, { fields: [clients.accountManagerUserId], references: [users.id] }), projects: many(projects), locations: many(locations),
  contacts: many(operationalContacts), staffingRequirements: many(staffingRequirements), employeeRelations: many(operationalEmployeeRelations), notes: many(operationalNotes),
}));
export const projectRelations = relations(projects, ({ many, one }) => ({
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }), responsibleAdmin: one(users, { fields: [projects.responsibleAdminUserId], references: [users.id] }),
  projectLocations: many(projectLocations), contacts: many(operationalContacts), staffingRequirements: many(staffingRequirements), employeeRelations: many(operationalEmployeeRelations), notes: many(operationalNotes),
}));
export const locationRelations = relations(locations, ({ many, one }) => ({
  client: one(clients, { fields: [locations.clientId], references: [clients.id] }), projectLocations: many(projectLocations), contacts: many(operationalContacts),
  staffingRequirements: many(staffingRequirements), employeeRelations: many(operationalEmployeeRelations), notes: many(operationalNotes),
}));
export const projectLocationRelations = relations(projectLocations, ({ one }) => ({
  project: one(projects, { fields: [projectLocations.projectId], references: [projects.id] }), location: one(locations, { fields: [projectLocations.locationId], references: [locations.id] }),
}));
export const schedulePeriodRelations = relations(schedulePeriods, ({ many, one }) => ({
  client: one(clients, { fields: [schedulePeriods.clientId], references: [clients.id] }),
  parentPeriod: one(schedulePeriods, { fields: [schedulePeriods.parentPeriodId], references: [schedulePeriods.id], relationName: "schedulePeriodParent" }),
  childPeriods: many(schedulePeriods, { relationName: "schedulePeriodParent" }), assignments: many(scheduleAssignments),
}));
export const scheduleAssignmentRelations = relations(scheduleAssignments, ({ many, one }) => ({
  schedulePeriod: one(schedulePeriods, { fields: [scheduleAssignments.schedulePeriodId], references: [schedulePeriods.id] }), employee: one(users, { fields: [scheduleAssignments.employeeUserId], references: [users.id] }),
  project: one(projects, { fields: [scheduleAssignments.projectId], references: [projects.id] }), location: one(locations, { fields: [scheduleAssignments.locationId], references: [locations.id] }),
  copiedFrom: one(scheduleAssignments, { fields: [scheduleAssignments.copiedFromAssignmentId], references: [scheduleAssignments.id], relationName: "scheduleAssignmentCopy" }), copies: many(scheduleAssignments, { relationName: "scheduleAssignmentCopy" }), requirements: many(assignmentSkillRequirements),
}));
export const assignmentSkillRequirementRelations = relations(assignmentSkillRequirements, ({ one }) => ({ assignment: one(scheduleAssignments, { fields: [assignmentSkillRequirements.scheduleAssignmentId], references: [scheduleAssignments.id] }), skill: one(skills, { fields: [assignmentSkillRequirements.skillId], references: [skills.id] }) }));
export const leaveRequestRelations = relations(leaveRequests, ({ one }) => ({ employee: one(users, { fields: [leaveRequests.employeeUserId], references: [users.id], relationName: "leaveRequestEmployee" }), reviewer: one(users, { fields: [leaveRequests.reviewedByUserId], references: [users.id], relationName: "leaveRequestReviewer" }) }));
