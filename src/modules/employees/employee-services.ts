import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import type {
  ArrangementLabelCreateInput, ArrangementLabelUpdateInput, AuditChangeMetadata, CatalogueCreateInput,
  CatalogueUpdateInput, CreateEmployeeProfileInput, EmployeeActor, EmployeeSkillCreateInput, EmployeeSkillUpdateInput,
  ManagementProfileUpdateInput, Page, PaginationInput, SelfProfileUpdateInput, SkillCreateInput, SkillUpdateInput,
} from "@/modules/employees/contracts";
import { EmployeeDomainError } from "@/modules/employees/domain-error";
import {
  arrangementCreateSchema, arrangementUpdateSchema, catalogueCreateSchema, catalogueUpdateSchema, createEmployeeProfileSchema,
  employeeSkillCreateSchema, employeeSkillUpdateSchema, managementProfileUpdateSchema, normalizeCatalogueName, skillCreateSchema, skillUpdateSchema,
  normalizeIdentifier, parseOrDomainError, selfProfileUpdateSchema,
} from "@/modules/employees/employee-validation";
import { canReadEmployee, requireEmployeeRead, requireOwnEditableProfile, requireSuperAdmin } from "@/modules/employees/employee-policy";
import {
  arrangementLabelRepository, type DatabaseExecutor, type DatabaseTransaction, designationRepository, employeeProfileRepository,
  employeeSkillRepository, skillRepository, type ProfileWithUser,
} from "@/modules/employees/employee-repositories";

type AuditWriter = typeof writeAuditEvent;
type CatalogueKind = "designation" | "skill" | "arrangement_label";
type CatalogueRepository = {
  getById: (tx: DatabaseTransaction, id: string) => Promise<{ id: string; name: string; active: boolean; version: number } | null>;
  getByNormalizedName: (tx: DatabaseTransaction, name: string) => Promise<{ id: string } | null>;
  create: (tx: DatabaseTransaction, input: never) => Promise<unknown>;
  update: (tx: DatabaseTransaction, id: string, expectedVersion: number, input: never) => Promise<unknown | null>;
  setActive: (tx: DatabaseTransaction, id: string, expectedVersion: number, active: boolean) => Promise<unknown | null>;
};

function changedFields(input: Record<string, unknown>) { return Object.keys(input).filter((key) => input[key] !== undefined && key !== "expectedVersion"); }
function cleanName(value: string) { return value.trim().replace(/\s+/g, " "); }
function actorTeamScopes(actor: EmployeeActor) { return actor.scopes.filter((scope) => scope.type === "TEAM").map((scope) => scope.reference); }

export type SuperAdminProfileView = ProfileWithUser;
export type ScopedEmployeeProfileView = Pick<ProfileWithUser, "userId" | "employeeCode" | "designationId" | "team" | "version"> & {
  user: Pick<ProfileWithUser["user"], "id" | "displayName" | "role" | "active">;
};
export type OwnEmployeeProfileView = ProfileWithUser;
export type EmployeeProfileView = SuperAdminProfileView | ScopedEmployeeProfileView | OwnEmployeeProfileView;

function scopedProjection(profile: ProfileWithUser): ScopedEmployeeProfileView {
  return {
    userId: profile.userId, employeeCode: profile.employeeCode, designationId: profile.designationId, team: profile.team, version: profile.version,
    user: { id: profile.user.id, displayName: profile.user.displayName, role: profile.user.role, active: profile.user.active },
  };
}

function profileProjection(actor: EmployeeActor, profile: ProfileWithUser): EmployeeProfileView {
  return actor.role === "ADMIN" && actor.id !== profile.userId ? scopedProjection(profile) : profile;
}

/** Application services are the authorization and transaction boundary for this Phase 2 core. */
export class EmployeeCatalogueService {
  constructor(private readonly auditWriter: AuditWriter = writeAuditEvent) {}

  private async audit(tx: DatabaseTransaction, actor: EmployeeActor, action: string, targetType: CatalogueKind, targetId: string, metadata: AuditChangeMetadata) {
    await this.auditWriter(tx, { actor, action, targetType, targetId, metadata });
  }

  private async lockName(tx: DatabaseTransaction, namespace: string, name: string) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${namespace}:${normalizeCatalogueName(name)}`}))`);
  }

  private async createCatalogue<T>(actor: EmployeeActor, kind: CatalogueKind, input: CatalogueCreateInput | ArrangementLabelCreateInput | SkillCreateInput, repository: CatalogueRepository) {
    requireSuperAdmin(actor);
    return db.transaction(async (tx) => {
      const parsed = kind === "arrangement_label" ? parseOrDomainError(arrangementCreateSchema, input) : kind === "skill" ? parseOrDomainError(skillCreateSchema, input) : parseOrDomainError(catalogueCreateSchema, input);
      await this.lockName(tx, kind, parsed.name);
      if (await repository.getByNormalizedName(tx, parsed.name)) throw new EmployeeDomainError("DUPLICATE_NAME");
      const record = await repository.create(tx, { ...parsed, name: cleanName(parsed.name) } as never) as T;
      const id = (record as { id: string }).id;
      await this.audit(tx, actor, `${kind}.created`, kind, id, { fields: changedFields(parsed) });
      return record;
    });
  }

  private async updateCatalogue<T>(actor: EmployeeActor, kind: CatalogueKind, id: string, input: CatalogueUpdateInput | ArrangementLabelUpdateInput | SkillUpdateInput, repository: CatalogueRepository) {
    requireSuperAdmin(actor);
    return db.transaction(async (tx) => {
      const parsed = kind === "arrangement_label" ? parseOrDomainError(arrangementUpdateSchema, input) : kind === "skill" ? parseOrDomainError(skillUpdateSchema, input) : parseOrDomainError(catalogueUpdateSchema, input);
      const current = await repository.getById(tx, id); if (!current) throw new EmployeeDomainError("NOT_FOUND");
      if (current.version !== parsed.expectedVersion) throw new EmployeeDomainError("STALE_VERSION");
      if (parsed.name !== undefined) {
        await this.lockName(tx, kind, parsed.name);
        const duplicate = await repository.getByNormalizedName(tx, parsed.name);
        if (duplicate && duplicate.id !== id) throw new EmployeeDomainError("DUPLICATE_NAME");
      }
      const { expectedVersion, ...update } = parsed;
      const record = await repository.update(tx, id, expectedVersion, { ...update, ...(update.name ? { name: cleanName(update.name) } : {}) } as never) as T | null;
      if (!record) throw new EmployeeDomainError("STALE_VERSION");
      await this.audit(tx, actor, `${kind}.updated`, kind, id, { fields: changedFields(update), version: expectedVersion + 1 });
      return record;
    });
  }

  private async setCatalogueActive<T>(actor: EmployeeActor, kind: CatalogueKind, id: string, expectedVersion: number, active: boolean, repository: CatalogueRepository) {
    requireSuperAdmin(actor);
    return db.transaction(async (tx) => {
      if (!Number.isInteger(expectedVersion) || expectedVersion <= 0) throw new EmployeeDomainError("VALIDATION_ERROR");
      const current = await repository.getById(tx, id); if (!current) throw new EmployeeDomainError("NOT_FOUND");
      if (current.version !== expectedVersion) throw new EmployeeDomainError("STALE_VERSION");
      const record = await repository.setActive(tx, id, expectedVersion, active) as T | null;
      if (!record) throw new EmployeeDomainError("STALE_VERSION");
      await this.audit(tx, actor, `${kind}.${active ? "reactivated" : "archived"}`, kind, id, { active, archive: !active, version: expectedVersion + 1 });
      return record;
    });
  }

  listDesignations(actor: EmployeeActor, input: PaginationInput = {}) { return designationRepository.list(db, { ...input, includeArchived: actor.role === "SUPER_ADMIN" && input.includeArchived }); }
  listSkills(actor: EmployeeActor, input: PaginationInput = {}) { return skillRepository.list(db, { ...input, includeArchived: actor.role === "SUPER_ADMIN" && input.includeArchived }); }
  listArrangementLabels(actor: EmployeeActor, input: PaginationInput = {}) { return arrangementLabelRepository.list(db, { ...input, includeArchived: actor.role === "SUPER_ADMIN" && input.includeArchived }); }
  createDesignation(actor: EmployeeActor, input: CatalogueCreateInput) { return this.createCatalogue(actor, "designation", input, designationRepository as CatalogueRepository); }
  updateDesignation(actor: EmployeeActor, id: string, input: CatalogueUpdateInput) { return this.updateCatalogue(actor, "designation", id, input, designationRepository as CatalogueRepository); }
  setDesignationActive(actor: EmployeeActor, id: string, expectedVersion: number, active: boolean) { return this.setCatalogueActive(actor, "designation", id, expectedVersion, active, designationRepository as CatalogueRepository); }
  createSkill(actor: EmployeeActor, input: SkillCreateInput) { return this.createCatalogue(actor, "skill", input, skillRepository as CatalogueRepository); }
  updateSkill(actor: EmployeeActor, id: string, input: SkillUpdateInput) { return this.updateCatalogue(actor, "skill", id, input, skillRepository as CatalogueRepository); }
  setSkillActive(actor: EmployeeActor, id: string, expectedVersion: number, active: boolean) { return this.setCatalogueActive(actor, "skill", id, expectedVersion, active, skillRepository as CatalogueRepository); }
  createArrangementLabel(actor: EmployeeActor, input: ArrangementLabelCreateInput) { return this.createCatalogue(actor, "arrangement_label", input, arrangementLabelRepository as CatalogueRepository); }
  updateArrangementLabel(actor: EmployeeActor, id: string, input: ArrangementLabelUpdateInput) { return this.updateCatalogue(actor, "arrangement_label", id, input, arrangementLabelRepository as CatalogueRepository); }
  setArrangementLabelActive(actor: EmployeeActor, id: string, expectedVersion: number, active: boolean) { return this.setCatalogueActive(actor, "arrangement_label", id, expectedVersion, active, arrangementLabelRepository as CatalogueRepository); }
}

export class EmployeeProfileService {
  constructor(private readonly auditWriter: AuditWriter = writeAuditEvent) {}

  private async audit(tx: DatabaseTransaction, actor: EmployeeActor, action: string, targetId: string, metadata: AuditChangeMetadata) {
    await this.auditWriter(tx, { actor, action, targetType: "employee_profile", targetId, metadata });
  }

  private async assertActiveDesignation(tx: DatabaseTransaction, designationId: string | null | undefined) {
    if (designationId === null || designationId === undefined) return;
    const designation = await designationRepository.getById(tx, designationId);
    if (!designation) throw new EmployeeDomainError("NOT_FOUND");
    if (!designation.active) throw new EmployeeDomainError("INACTIVE_REFERENCE");
  }

  private async assertValidManager(tx: DatabaseTransaction, userId: string, managerUserId: string | null | undefined) {
    if (managerUserId === null || managerUserId === undefined) return;
    if (managerUserId === userId) throw new EmployeeDomainError("INVALID_MANAGER");
    const manager = await employeeProfileRepository.findUser(tx, managerUserId);
    if (!manager?.active) throw new EmployeeDomainError("INVALID_MANAGER");
    const chain = await employeeProfileRepository.managerChain(tx, managerUserId);
    if (chain.hasExistingCycle || chain.chain.includes(userId)) throw new EmployeeDomainError("INVALID_MANAGER");
  }

  private async assertExistingActiveEmployee(tx: DatabaseTransaction, userId: string) {
    const user = await employeeProfileRepository.findUser(tx, userId);
    if (!user?.active) throw new EmployeeDomainError("INVALID_EMPLOYEE");
    return user;
  }

  async getProfile(actor: EmployeeActor, userId: string): Promise<EmployeeProfileView> {
    const profile = await employeeProfileRepository.getByUserId(db, userId);
    if (!profile) throw new EmployeeDomainError("NOT_FOUND");
    requireEmployeeRead(actor, { userId: profile.userId, team: profile.team, role: profile.user.role });
    return profileProjection(actor, profile);
  }

  getOwnProfile(actor: EmployeeActor) { return this.getProfile(actor, actor.id); }

  async listProfiles(actor: EmployeeActor, input: PaginationInput = {}): Promise<Page<EmployeeProfileView>> {
    if (actor.role === "SUPER_ADMIN") return employeeProfileRepository.list(db, input);
    if (actor.role === "ADMIN") {
      const page = await employeeProfileRepository.list(db, { ...input, teams: actorTeamScopes(actor) });
      return { ...page, items: page.items.map(scopedProjection) };
    }
    const own = await employeeProfileRepository.getByUserId(db, actor.id);
    return { items: own ? [own] : [], total: own ? 1 : 0, page: 1, pageSize: 1 };
  }

  /** Management directory reads are distinct from an Employee's future own-profile journey. */
  async listDirectoryProfiles(actor: EmployeeActor): Promise<Page<EmployeeProfileView>> {
    if (actor.role === "EMPLOYEE") throw new EmployeeDomainError("FORBIDDEN");
    return this.listProfiles(actor, { page: 1, pageSize: 100 });
  }

  async createProfile(actor: EmployeeActor, input: CreateEmployeeProfileInput) {
    requireSuperAdmin(actor); const parsed = parseOrDomainError(createEmployeeProfileSchema, input);
    return db.transaction(async (tx) => {
      await this.assertExistingActiveEmployee(tx, parsed.userId);
      if (await employeeProfileRepository.getByUserId(tx, parsed.userId)) throw new EmployeeDomainError("CONFLICT");
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`employee-code:${normalizeIdentifier(parsed.employeeCode)}`}))`);
      if (await employeeProfileRepository.findByNormalizedEmployeeCode(tx, parsed.employeeCode)) throw new EmployeeDomainError("CONFLICT");
      await this.assertActiveDesignation(tx, parsed.designationId); await this.assertValidManager(tx, parsed.userId, parsed.managerUserId);
      const profile = await employeeProfileRepository.create(tx, { ...parsed, employeeCode: parsed.employeeCode.trim().replace(/\s+/g, " ") });
      await this.audit(tx, actor, "employee_profile.created", profile.userId, { fields: changedFields(parsed) });
      return profile;
    });
  }

  async updateManagementProfile(actor: EmployeeActor, userId: string, input: ManagementProfileUpdateInput) {
    requireSuperAdmin(actor); const parsed = parseOrDomainError(managementProfileUpdateSchema, input);
    return db.transaction(async (tx) => {
      const current = await employeeProfileRepository.getByUserId(tx, userId); if (!current) throw new EmployeeDomainError("NOT_FOUND");
      if (current.version !== parsed.expectedVersion) throw new EmployeeDomainError("STALE_VERSION");
      if (parsed.employeeCode !== undefined && normalizeIdentifier(parsed.employeeCode) !== normalizeIdentifier(current.employeeCode)) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`employee-code:${normalizeIdentifier(parsed.employeeCode)}`}))`);
        const duplicate = await employeeProfileRepository.findByNormalizedEmployeeCode(tx, parsed.employeeCode);
        if (duplicate && duplicate.userId !== userId) throw new EmployeeDomainError("CONFLICT");
      }
      await this.assertActiveDesignation(tx, parsed.designationId); await this.assertValidManager(tx, userId, parsed.managerUserId);
      const { expectedVersion, ...update } = parsed;
      const profile = await employeeProfileRepository.update(tx, userId, expectedVersion, { ...update, ...(update.employeeCode ? { employeeCode: update.employeeCode.trim().replace(/\s+/g, " ") } : {}) });
      if (!profile) throw new EmployeeDomainError("STALE_VERSION");
      await this.audit(tx, actor, "employee_profile.management_updated", userId, { fields: changedFields(update), version: expectedVersion + 1 });
      return profile;
    });
  }

  async updateOwnProfile(actor: EmployeeActor, userId: string, input: SelfProfileUpdateInput) {
    requireOwnEditableProfile(actor, userId); const parsed = parseOrDomainError(selfProfileUpdateSchema, input);
    return db.transaction(async (tx) => {
      const current = await employeeProfileRepository.getByUserId(tx, userId); if (!current) throw new EmployeeDomainError("NOT_FOUND");
      if (current.version !== parsed.expectedVersion) throw new EmployeeDomainError("STALE_VERSION");
      const { expectedVersion, ...update } = parsed;
      const profile = await employeeProfileRepository.update(tx, userId, expectedVersion, update);
      if (!profile) throw new EmployeeDomainError("STALE_VERSION");
      await this.audit(tx, actor, "employee_profile.self_updated", userId, { fields: changedFields(update), version: expectedVersion + 1 });
      return profile;
    });
  }

  async setEmployeeActive(actor: EmployeeActor, userId: string, expectedVersion: number, active: boolean) {
    requireSuperAdmin(actor);
    return db.transaction(async (tx) => {
      const current = await employeeProfileRepository.getByUserId(tx, userId); if (!current) throw new EmployeeDomainError("NOT_FOUND");
      if (current.version !== expectedVersion) throw new EmployeeDomainError("STALE_VERSION");
      const profile = await employeeProfileRepository.update(tx, userId, expectedVersion, {});
      if (!profile) throw new EmployeeDomainError("STALE_VERSION");
      await employeeProfileRepository.setUserActive(tx, userId, active);
      await this.audit(tx, actor, `employee_profile.${active ? "reactivated" : "deactivated"}`, userId, { active, version: expectedVersion + 1 });
      return profile;
    });
  }
}

export class EmployeeSkillService {
  constructor(private readonly auditWriter: AuditWriter = writeAuditEvent) {}
  private async audit(tx: DatabaseTransaction, actor: EmployeeActor, action: string, targetId: string, metadata: AuditChangeMetadata) {
    await this.auditWriter(tx, { actor, action, targetType: "employee_skill", targetId, metadata });
  }
  private async profileForRead(tx: DatabaseExecutor, actor: EmployeeActor, employeeUserId: string) {
    const profile = await employeeProfileRepository.getByUserId(tx, employeeUserId); if (!profile) throw new EmployeeDomainError("NOT_FOUND");
    requireEmployeeRead(actor, { userId: profile.userId, team: profile.team, role: profile.user.role }); return profile;
  }
  async listForEmployee(actor: EmployeeActor, employeeUserId: string, includeArchived = false) {
    await this.profileForRead(db, actor, employeeUserId);
    return employeeSkillRepository.listForEmployee(db, employeeUserId, actor.role === "SUPER_ADMIN" && includeArchived);
  }
  async listEmployeesForSkill(actor: EmployeeActor, skillId: string) {
    if (actor.role === "EMPLOYEE") throw new EmployeeDomainError("FORBIDDEN");
    const skill = await skillRepository.getById(db, skillId); if (!skill) throw new EmployeeDomainError("NOT_FOUND");
    const records = await employeeSkillRepository.listEmployeesForSkill(db, skillId, actor.role === "ADMIN" ? actorTeamScopes(actor) : undefined);
    if (actor.role !== "ADMIN") return records;
    return records.map(({ association, profile, user }) => ({
      association,
      profile: scopedProjection({ ...profile, user }),
    }));
  }
  async add(actor: EmployeeActor, input: EmployeeSkillCreateInput) {
    requireSuperAdmin(actor); const parsed = parseOrDomainError(employeeSkillCreateSchema, input);
    return db.transaction(async (tx) => {
      const profile = await employeeProfileRepository.getByUserId(tx, parsed.employeeUserId); if (!profile?.user.active) throw new EmployeeDomainError("INVALID_EMPLOYEE");
      const skill = await skillRepository.getById(tx, parsed.skillId); if (!skill) throw new EmployeeDomainError("NOT_FOUND"); if (!skill.active) throw new EmployeeDomainError("INACTIVE_REFERENCE");
      if (await employeeSkillRepository.getByEmployeeAndSkill(tx, parsed.employeeUserId, parsed.skillId)) throw new EmployeeDomainError("INVALID_SKILL_ASSOCIATION");
      const association = await employeeSkillRepository.create(tx, parsed);
      await this.audit(tx, actor, "employee_skill.created", association.id, { fields: changedFields(parsed) }); return association;
    });
  }
  async update(actor: EmployeeActor, id: string, input: EmployeeSkillUpdateInput) {
    requireSuperAdmin(actor); const parsed = parseOrDomainError(employeeSkillUpdateSchema, input);
    return db.transaction(async (tx) => {
      const current = await employeeSkillRepository.getById(tx, id); if (!current) throw new EmployeeDomainError("NOT_FOUND");
      if (current.version !== parsed.expectedVersion) throw new EmployeeDomainError("STALE_VERSION");
      const { expectedVersion, ...update } = parsed; const association = await employeeSkillRepository.update(tx, id, expectedVersion, update);
      if (!association) throw new EmployeeDomainError("STALE_VERSION");
      await this.audit(tx, actor, "employee_skill.updated", id, { fields: changedFields(update), version: expectedVersion + 1 }); return association;
    });
  }
  async setArchived(actor: EmployeeActor, id: string, expectedVersion: number, archived: boolean) {
    requireSuperAdmin(actor);
    return db.transaction(async (tx) => {
      const current = await employeeSkillRepository.getById(tx, id); if (!current) throw new EmployeeDomainError("NOT_FOUND");
      if (current.version !== expectedVersion) throw new EmployeeDomainError("STALE_VERSION");
      if (!archived) { const skill = await skillRepository.getById(tx, current.skillId); if (!skill?.active) throw new EmployeeDomainError("INACTIVE_REFERENCE"); }
      const association = await employeeSkillRepository.setArchived(tx, id, expectedVersion, archived); if (!association) throw new EmployeeDomainError("STALE_VERSION");
      await this.audit(tx, actor, `employee_skill.${archived ? "archived" : "reactivated"}`, id, { archive: archived, version: expectedVersion + 1 }); return association;
    });
  }
}

export const employeeCatalogueService = new EmployeeCatalogueService();
export const employeeProfileService = new EmployeeProfileService();
export const employeeSkillService = new EmployeeSkillService();
