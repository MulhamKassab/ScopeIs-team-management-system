import "server-only";
import { db } from "@/db/client";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { OperationalDomainError } from "@/modules/operations/domain-error";
import { operationalRepository, scopeGrantRepository, type OperationalExecutor, type OperationalTransaction, type ScopeRow } from "@/modules/operations/repositories";
import {
  contactSchema, createClientSchema, createLocationSchema, createProjectSchema, employeeRelationSchema, grantSchema, lifecycleSchema, listQuerySchema, noteArchiveSchema, noteCreateSchema, noteUpdateSchema,
  operationalTargetSchema, parseOperational, projectLocationSchema, revokeGrantSchema, staffingRequirementSchema, supportingArchiveSchema, updateClientSchema, updateLocationSchema, updateProjectSchema,
  type OperationalTarget,
} from "@/modules/operations/validation";
import type { AuthenticatedActor } from "@/shared/types/foundation";

type AuditWriter = typeof writeAuditEvent;
type ParentColumns = { clientId?: string; projectId?: string; locationId?: string };

function parentColumns(target: OperationalTarget): ParentColumns { return target.type === "CLIENT" ? { clientId: target.id } : target.type === "PROJECT" ? { projectId: target.id } : { locationId: target.id }; }
function fields(input: Record<string, unknown>) { return Object.keys(input).filter((key) => input[key] !== undefined && key !== "expectedVersion"); }
function uniqueFailure(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "23505"; }

export class OperationalService {
  constructor(private readonly auditWriter: AuditWriter = writeAuditEvent) {}
  private audit(tx: OperationalTransaction, actor: AuthenticatedActor, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) {
    return this.auditWriter(tx, { actor, action, targetType, targetId, metadata });
  }
  private async grants(executor: OperationalExecutor, actor: AuthenticatedActor) { return actor.role === "ADMIN" ? scopeGrantRepository.activeForUser(executor, actor.id) : []; }
  private hasGrant(grants: ScopeRow[], type: "CLIENT" | "PROJECT" | "LOCATION", reference: string) { return grants.some((grant) => grant.scopeType === type && grant.scopeReference === reference); }
  private async target(executor: OperationalExecutor, input: OperationalTarget) {
    if (input.type === "CLIENT") { const client = await operationalRepository.client(executor, input.id); if (!client) throw new OperationalDomainError("NOT_FOUND"); return { target: input, client, record: client }; }
    if (input.type === "PROJECT") { const project = await operationalRepository.project(executor, input.id); if (!project) throw new OperationalDomainError("NOT_FOUND"); const client = await operationalRepository.client(executor, project.clientId); if (!client) throw new OperationalDomainError("NOT_FOUND"); return { target: input, client, project, record: project }; }
    const location = await operationalRepository.location(executor, input.id); if (!location) throw new OperationalDomainError("NOT_FOUND"); const client = await operationalRepository.client(executor, location.clientId); if (!client) throw new OperationalDomainError("NOT_FOUND"); return { target: input, client, location, record: location };
  }
  private async requireTarget(executor: OperationalExecutor, actor: AuthenticatedActor, input: OperationalTarget) {
    if (actor.role === "EMPLOYEE") throw new OperationalDomainError("FORBIDDEN");
    const loaded = await this.target(executor, input); if (actor.role === "SUPER_ADMIN") return loaded;
    const grants = await this.grants(executor, actor);
    const allowed = this.hasGrant(grants, "CLIENT", loaded.client.id)
      || (input.type === "PROJECT" && this.hasGrant(grants, "PROJECT", input.id))
      || (input.type === "LOCATION" && this.hasGrant(grants, "LOCATION", input.id));
    if (!allowed) throw new OperationalDomainError("OUT_OF_SCOPE"); return loaded;
  }
  private ensureActive(loaded: Awaited<ReturnType<OperationalService["target"]>>) {
    if (loaded.client.status === "ARCHIVED") throw new OperationalDomainError("ARCHIVED_RECORD");
    if ("project" in loaded && loaded.project?.status === "ARCHIVED") throw new OperationalDomainError("ARCHIVED_RECORD");
    if ("location" in loaded && loaded.location?.status === "ARCHIVED") throw new OperationalDomainError("ARCHIVED_RECORD");
  }
  private async validateEmployee(executor: OperationalExecutor, id: string, role?: "ADMIN") {
    const row = await operationalRepository.user(executor, id); if (!row?.user.active || !row.profile || (role && row.user.role !== role)) throw new OperationalDomainError("INVALID_EMPLOYEE"); return row;
  }
  async listClients(actor: AuthenticatedActor, input: unknown = {}) {
    if (actor.role === "EMPLOYEE") throw new OperationalDomainError("FORBIDDEN"); const query = parseOperational(listQuerySchema, input);
    if (actor.role === "SUPER_ADMIN") return operationalRepository.listClients(db, query);
    const grants = await this.grants(db, actor); return operationalRepository.listClients(db, { ...query, allowedIds: grants.filter((grant) => grant.scopeType === "CLIENT").map((grant) => grant.scopeReference) });
  }
  async listProjects(actor: AuthenticatedActor, input: unknown = {}) {
    if (actor.role === "EMPLOYEE") throw new OperationalDomainError("FORBIDDEN"); const query = parseOperational(listQuerySchema, input);
    if (actor.role === "SUPER_ADMIN") return operationalRepository.listProjects(db, query);
    const grants = await this.grants(db, actor); return operationalRepository.listProjects(db, { ...query, clientIds: grants.filter((g) => g.scopeType === "CLIENT").map((g) => g.scopeReference), projectIds: grants.filter((g) => g.scopeType === "PROJECT").map((g) => g.scopeReference) });
  }
  async listLocations(actor: AuthenticatedActor, input: unknown = {}) {
    if (actor.role === "EMPLOYEE") throw new OperationalDomainError("FORBIDDEN"); const query = parseOperational(listQuerySchema, input);
    if (actor.role === "SUPER_ADMIN") return operationalRepository.listLocations(db, query);
    const grants = await this.grants(db, actor); return operationalRepository.listLocations(db, { ...query, clientIds: grants.filter((g) => g.scopeType === "CLIENT").map((g) => g.scopeReference), locationIds: grants.filter((g) => g.scopeType === "LOCATION").map((g) => g.scopeReference) });
  }
  async getClientDetail(actor: AuthenticatedActor, id: string) {
    const target = parseOperational(operationalTargetSchema, { type: "CLIENT", id }); const loaded = await this.requireTarget(db, actor, target);
    const [details, projects, locations] = await Promise.all([operationalRepository.details(db, target), operationalRepository.listProjects(db, { query: "", includeArchived: true, clientIds: [id] }), operationalRepository.listLocations(db, { query: "", includeArchived: true, clientId: id })]);
    return { client: loaded.client, details, projects, locations };
  }
  async getProjectDetail(actor: AuthenticatedActor, id: string) {
    const target = parseOperational(operationalTargetSchema, { type: "PROJECT", id }); const loaded = await this.requireTarget(db, actor, target);
    const [details, linkedLocations] = await Promise.all([operationalRepository.details(db, target), operationalRepository.linkedLocations(db, id)]);
    const grants = await this.grants(db, actor); const allLocationIds = actor.role === "SUPER_ADMIN" || this.hasGrant(grants, "CLIENT", loaded.client.id) ? undefined : grants.filter((g) => g.scopeType === "LOCATION").map((g) => g.scopeReference);
    const locationMatches = await operationalRepository.listLocations(db, { query: "", includeArchived: false, clientId: loaded.client.id, locationIds: allLocationIds });
    return { project: loaded.project!, client: loaded.client, details, linkedLocations, locationMatches };
  }
  async getLocationDetail(actor: AuthenticatedActor, id: string) {
    const target = parseOperational(operationalTargetSchema, { type: "LOCATION", id }); const loaded = await this.requireTarget(db, actor, target);
    const [details, relatedProjects] = await Promise.all([operationalRepository.details(db, target), operationalRepository.relatedProjects(db, id)]);
    return { location: loaded.location!, client: loaded.client, details, relatedProjects };
  }
  async formOptions(actor: AuthenticatedActor) {
    if (actor.role === "EMPLOYEE") throw new OperationalDomainError("FORBIDDEN");
    const [employees, skills] = await Promise.all([operationalRepository.listEmployees(db), operationalRepository.listSkills(db)]); return { employees, skills };
  }
  async createClient(actor: AuthenticatedActor, input: unknown) {
    if (actor.role !== "SUPER_ADMIN") throw new OperationalDomainError("FORBIDDEN"); const parsed = parseOperational(createClientSchema, input); if (parsed.accountManagerUserId) await this.validateEmployee(db, parsed.accountManagerUserId);
    try { return await db.transaction(async (tx) => { const row = await operationalRepository.createClient(tx, parsed); await this.audit(tx, actor, "client.created", "client", row.id, { fields: fields(parsed) }); return row; }); } catch (error) { if (uniqueFailure(error)) throw new OperationalDomainError("CONFLICT"); throw error; }
  }
  async updateClient(actor: AuthenticatedActor, id: string, input: unknown) {
    const parsed = parseOperational(updateClientSchema, input); const loaded = await this.requireTarget(db, actor, { type: "CLIENT", id }); if (parsed.accountManagerUserId) await this.validateEmployee(db, parsed.accountManagerUserId);
    if (loaded.client.status === "ARCHIVED") throw new OperationalDomainError("ARCHIVED_RECORD");
    return db.transaction(async (tx) => { const row = await operationalRepository.updateClient(tx, id, parsed.expectedVersion, parsed); if (!row) throw new OperationalDomainError("STALE_VERSION"); await this.audit(tx, actor, "client.updated", "client", id, { fields: fields(parsed), version: row.version }); return row; });
  }
  async setClientArchived(actor: AuthenticatedActor, id: string, input: unknown) {
    const parsed = parseOperational(lifecycleSchema, input); await this.requireTarget(db, actor, { type: "CLIENT", id });
    return db.transaction(async (tx) => { if (parsed.archived && await operationalRepository.unfinishedProjectCount(tx, id) > 0) throw new OperationalDomainError("ARCHIVE_BLOCKED"); const row = await operationalRepository.updateClient(tx, id, parsed.expectedVersion, { status: parsed.archived ? "ARCHIVED" : "ACTIVE" }); if (!row) throw new OperationalDomainError("STALE_VERSION"); await this.audit(tx, actor, `client.${parsed.archived ? "archived" : "reactivated"}`, "client", id, { status: row.status, version: row.version }); return row; });
  }
  async createProject(actor: AuthenticatedActor, input: unknown) {
    const parsed = parseOperational(createProjectSchema, input); const loaded = await this.requireTarget(db, actor, { type: "CLIENT", id: parsed.clientId }); this.ensureActive(loaded); if (parsed.responsibleAdminUserId) await this.validateEmployee(db, parsed.responsibleAdminUserId, "ADMIN");
    try { return await db.transaction(async (tx) => { const row = await operationalRepository.createProject(tx, parsed); await this.audit(tx, actor, "project.created", "project", row.id, { clientId: row.clientId, fields: fields(parsed) }); return row; }); } catch (error) { if (uniqueFailure(error)) throw new OperationalDomainError("CONFLICT"); throw error; }
  }
  async updateProject(actor: AuthenticatedActor, id: string, input: unknown) {
    const parsed = parseOperational(updateProjectSchema, input); await this.requireTarget(db, actor, { type: "PROJECT", id }); if (parsed.responsibleAdminUserId) await this.validateEmployee(db, parsed.responsibleAdminUserId, "ADMIN");
    try { return await db.transaction(async (tx) => { const row = await operationalRepository.updateProject(tx, id, parsed.expectedVersion, parsed); if (!row) throw new OperationalDomainError("STALE_VERSION"); await this.audit(tx, actor, "project.updated", "project", id, { fields: fields(parsed), status: row.status, version: row.version }); return row; }); } catch (error) { if (uniqueFailure(error)) throw new OperationalDomainError("CONFLICT"); throw error; }
  }
  async createLocation(actor: AuthenticatedActor, input: unknown) {
    const parsed = parseOperational(createLocationSchema, input); const loaded = await this.requireTarget(db, actor, { type: "CLIENT", id: parsed.clientId }); this.ensureActive(loaded);
    return db.transaction(async (tx) => { const row = await operationalRepository.createLocation(tx, parsed); await this.audit(tx, actor, "location.created", "location", row.id, { clientId: row.clientId, fields: fields(parsed) }); return row; });
  }
  async updateLocation(actor: AuthenticatedActor, id: string, input: unknown) {
    const parsed = parseOperational(updateLocationSchema, input); const loaded = await this.requireTarget(db, actor, { type: "LOCATION", id }); if (loaded.location!.status === "ARCHIVED") throw new OperationalDomainError("ARCHIVED_RECORD");
    return db.transaction(async (tx) => { const row = await operationalRepository.updateLocation(tx, id, parsed.expectedVersion, parsed); if (!row) throw new OperationalDomainError("STALE_VERSION"); await this.audit(tx, actor, "location.updated", "location", id, { fields: fields(parsed), version: row.version }); return row; });
  }
  async setLocationArchived(actor: AuthenticatedActor, id: string, input: unknown) {
    const parsed = parseOperational(lifecycleSchema, input); await this.requireTarget(db, actor, { type: "LOCATION", id });
    return db.transaction(async (tx) => { const row = await operationalRepository.updateLocation(tx, id, parsed.expectedVersion, { status: parsed.archived ? "ARCHIVED" : "ACTIVE" }); if (!row) throw new OperationalDomainError("STALE_VERSION"); await this.audit(tx, actor, `location.${parsed.archived ? "archived" : "reactivated"}`, "location", id, { status: row.status, version: row.version }); return row; });
  }
  async linkProjectLocation(actor: AuthenticatedActor, input: unknown) {
    const parsed = parseOperational(projectLocationSchema, input); const projectLoaded = await this.requireTarget(db, actor, { type: "PROJECT", id: parsed.projectId }); const locationLoaded = await this.requireTarget(db, actor, { type: "LOCATION", id: parsed.locationId }); this.ensureActive(projectLoaded); this.ensureActive(locationLoaded);
    if (projectLoaded.client.id !== locationLoaded.client.id) throw new OperationalDomainError("INVALID_RELATIONSHIP");
    return db.transaction(async (tx) => { const existing = await operationalRepository.projectLocation(tx, parsed.projectId, parsed.locationId); let row;
      if (existing && !existing.archivedAt) throw new OperationalDomainError("DUPLICATE_RELATIONSHIP");
      if (existing) { if (parsed.expectedVersion !== undefined && parsed.expectedVersion !== existing.version) throw new OperationalDomainError("STALE_VERSION"); row = await operationalRepository.setProjectLocationArchived(tx, existing.id, existing.version, false); }
      else row = await operationalRepository.createProjectLocation(tx, parsed.projectId, parsed.locationId);
      if (!row) throw new OperationalDomainError("STALE_VERSION"); await this.audit(tx, actor, "project_location.linked", "project_location", row.id, { projectId: parsed.projectId, locationId: parsed.locationId, version: row.version }); return row;
    });
  }
  async unlinkProjectLocation(actor: AuthenticatedActor, projectId: string, locationId: string, expectedVersion: number) {
    await this.requireTarget(db, actor, { type: "PROJECT", id: projectId }); await this.requireTarget(db, actor, { type: "LOCATION", id: locationId });
    return db.transaction(async (tx) => { const existing = await operationalRepository.projectLocation(tx, projectId, locationId); if (!existing) throw new OperationalDomainError("NOT_FOUND"); const row = await operationalRepository.setProjectLocationArchived(tx, existing.id, expectedVersion, true); if (!row) throw new OperationalDomainError("STALE_VERSION"); await this.audit(tx, actor, "project_location.unlinked", "project_location", row.id, { projectId, locationId, version: row.version }); return row; });
  }
  async addContact(actor: AuthenticatedActor, input: unknown) { const parsed = parseOperational(contactSchema, input); const target = { type: parsed.type, id: parsed.id } as OperationalTarget; const loaded = await this.requireTarget(db, actor, target); this.ensureActive(loaded); return db.transaction(async (tx) => { const row = await operationalRepository.createContact(tx, { ...parentColumns(target), name: parsed.name, roleTitle: parsed.roleTitle, workPhone: parsed.workPhone, workEmail: parsed.workEmail }); await this.audit(tx, actor, "operational_contact.created", "operational_contact", row.id, { targetType: target.type, targetId: target.id }); return row; }); }
  async addRequirement(actor: AuthenticatedActor, input: unknown) { const parsed = parseOperational(staffingRequirementSchema, input); const target = { type: parsed.type, id: parsed.id } as OperationalTarget; const loaded = await this.requireTarget(db, actor, target); this.ensureActive(loaded); const skill = await operationalRepository.skill(db, parsed.requiredSkillId); if (!skill?.active) throw new OperationalDomainError("INVALID_SKILL"); return db.transaction(async (tx) => { const row = await operationalRepository.createRequirement(tx, { ...parentColumns(target), requiredSkillId: parsed.requiredSkillId, requiredEmployeeCount: parsed.requiredEmployeeCount, note: parsed.note }); await this.audit(tx, actor, "staffing_requirement.created", "staffing_requirement", row.id, { targetType: target.type, targetId: target.id, requiredSkillId: parsed.requiredSkillId, count: parsed.requiredEmployeeCount }); return row; }); }
  async addEmployeeRelation(actor: AuthenticatedActor, input: unknown) { const parsed = parseOperational(employeeRelationSchema, input); const target = { type: parsed.type, id: parsed.id } as OperationalTarget; const loaded = await this.requireTarget(db, actor, target); this.ensureActive(loaded); await this.validateEmployee(db, parsed.employeeUserId); return db.transaction(async (tx) => { const columns = parentColumns(target); const existing = await operationalRepository.findEmployeeRelation(tx, columns, parsed.employeeUserId); let row; if (existing && !existing.archivedAt) throw new OperationalDomainError("DUPLICATE_RELATIONSHIP"); row = existing ? await operationalRepository.reactivateEmployeeRelation(tx, existing.id, existing.version) : await operationalRepository.createEmployeeRelation(tx, { ...columns, employeeUserId: parsed.employeeUserId }); if (!row) throw new OperationalDomainError("STALE_VERSION"); await this.audit(tx, actor, "operational_employee_relation.created", "operational_employee_relation", row.id, { targetType: target.type, targetId: target.id, employeeUserId: parsed.employeeUserId }); return row; }); }
  async addNote(actor: AuthenticatedActor, input: unknown) { const parsed = parseOperational(noteCreateSchema, input); const target = { type: parsed.type, id: parsed.id } as OperationalTarget; const loaded = await this.requireTarget(db, actor, target); this.ensureActive(loaded); return db.transaction(async (tx) => { const row = await operationalRepository.createNote(tx, { ...parentColumns(target), authorUserId: actor.id, content: parsed.content }); await this.audit(tx, actor, "operational_note.created", "operational_note", row.id, { targetType: target.type, targetId: target.id }); return row; }); }
  async updateNote(actor: AuthenticatedActor, input: unknown) { const parsed = parseOperational(noteUpdateSchema, input); const note = await operationalRepository.note(db, parsed.noteId); if (!note || note.archivedAt) throw new OperationalDomainError("NOT_FOUND"); const target = note.clientId ? { type: "CLIENT" as const, id: note.clientId } : note.projectId ? { type: "PROJECT" as const, id: note.projectId } : { type: "LOCATION" as const, id: note.locationId! }; await this.requireTarget(db, actor, target); if (note.authorUserId !== actor.id) throw new OperationalDomainError("FORBIDDEN"); return db.transaction(async (tx) => { const row = await operationalRepository.updateNote(tx, note.id, parsed.expectedVersion, parsed.content); if (!row) throw new OperationalDomainError("STALE_VERSION"); await this.audit(tx, actor, "operational_note.updated", "operational_note", row.id, { targetType: target.type, targetId: target.id, version: row.version }); return row; }); }
  async archiveNote(actor: AuthenticatedActor, input: unknown) { if (actor.role !== "SUPER_ADMIN") throw new OperationalDomainError("FORBIDDEN"); const parsed = parseOperational(noteArchiveSchema, input); const note = await operationalRepository.note(db, parsed.noteId); if (!note || note.archivedAt) throw new OperationalDomainError("NOT_FOUND"); return db.transaction(async (tx) => { const row = await operationalRepository.archiveNote(tx, note.id, parsed.expectedVersion, actor.id, parsed.reason); if (!row) throw new OperationalDomainError("STALE_VERSION"); await this.audit(tx, actor, "operational_note.archived", "operational_note", row.id, { version: row.version, archiveReasonProvided: true }); return row; }); }
  async archiveSupporting(actor: AuthenticatedActor, input: unknown) { const parsed = parseOperational(supportingArchiveSchema, input); const row = await operationalRepository.supportingById(db, parsed.kind, parsed.id); if (!row) throw new OperationalDomainError("NOT_FOUND"); const target = row.clientId ? { type: "CLIENT" as const, id: row.clientId } : row.projectId ? { type: "PROJECT" as const, id: row.projectId } : { type: "LOCATION" as const, id: row.locationId! }; await this.requireTarget(db, actor, target); return db.transaction(async (tx) => { const archived = await operationalRepository.archiveSupporting(tx, parsed.kind, parsed.id, parsed.expectedVersion); if (!archived) throw new OperationalDomainError("STALE_VERSION"); await this.audit(tx, actor, `${parsed.kind.toLowerCase()}.archived`, parsed.kind.toLowerCase(), parsed.id, { targetType: target.type, targetId: target.id, version: archived.version }); return archived; }); }
  async listOperationalGrants(actor: AuthenticatedActor) { if (actor.role !== "SUPER_ADMIN") throw new OperationalDomainError("FORBIDDEN"); return scopeGrantRepository.listOperational(db); }
  async grantScope(actor: AuthenticatedActor, input: unknown) { if (actor.role !== "SUPER_ADMIN") throw new OperationalDomainError("FORBIDDEN"); const parsed = parseOperational(grantSchema, input); await this.validateEmployee(db, parsed.adminUserId, "ADMIN"); const loaded = await this.target(db, parsed.target); this.ensureActive(loaded); return db.transaction(async (tx) => { const existing = await scopeGrantRepository.byTarget(tx, parsed.adminUserId, parsed.target.type, parsed.target.id); let row; if (existing?.active) throw new OperationalDomainError("DUPLICATE_RELATIONSHIP"); if (existing) { if (parsed.expectedVersion !== undefined && parsed.expectedVersion !== existing.version) throw new OperationalDomainError("STALE_VERSION"); row = await scopeGrantRepository.reactivate(tx, existing.id, existing.version); } else row = await scopeGrantRepository.create(tx, parsed.adminUserId, parsed.target.type, parsed.target.id); if (!row) throw new OperationalDomainError("STALE_VERSION"); await this.audit(tx, actor, "admin_scope_grant.granted", "scope_grant", row.id, { adminUserId: parsed.adminUserId, scopeType: parsed.target.type, scopeTargetId: parsed.target.id, version: row.version }); return row; }); }
  async revokeScope(actor: AuthenticatedActor, input: unknown) { if (actor.role !== "SUPER_ADMIN") throw new OperationalDomainError("FORBIDDEN"); const parsed = parseOperational(revokeGrantSchema, input); return db.transaction(async (tx) => { const grant = await scopeGrantRepository.byId(tx, parsed.grantId); if (!grant || !["CLIENT", "PROJECT", "LOCATION"].includes(grant.scopeType)) throw new OperationalDomainError("NOT_FOUND"); const row = await scopeGrantRepository.revoke(tx, grant.id, parsed.expectedVersion); if (!row) throw new OperationalDomainError("STALE_VERSION"); await this.audit(tx, actor, "admin_scope_grant.revoked", "scope_grant", row.id, { adminUserId: row.userId, scopeType: row.scopeType, scopeTargetId: row.scopeReference, version: row.version }); return row; }); }
}

export const operationalService = new OperationalService();
