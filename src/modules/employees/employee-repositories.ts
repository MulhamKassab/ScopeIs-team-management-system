import "server-only";
import { and, asc, count, eq, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  adminScopeGrants, arrangementLabels, designations, employeeCodeSequence, employeeEvidence, employeeProfiles, employeeSkills, sessions, skills, users,
} from "@/db/schema";
import type { EmployeeDirectoryQuery, PaginationInput } from "@/modules/employees/contracts";
import { normalizeCatalogueName, normalizeIdentifier, parseOrDomainError, paginationSchema } from "@/modules/employees/employee-validation";

export type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DatabaseExecutor = typeof db | DatabaseTransaction;
export type ProfileWithUser = typeof employeeProfiles.$inferSelect & { user: typeof users.$inferSelect };

function pageInput(input: PaginationInput) { return parseOrDomainError(paginationSchema, input); }
function catalogueWhere(table: typeof designations | typeof skills | typeof arrangementLabels, input: PaginationInput) {
  const parsed = pageInput(input);
  const conditions = [];
  if (!parsed.includeArchived) conditions.push(isNull(table.archivedAt));
  if (parsed.query) conditions.push(ilike(table.name, `%${parsed.query}%`));
  return { parsed, where: conditions.length ? and(...conditions) : undefined };
}

async function designationPage(executor: DatabaseExecutor, input: PaginationInput) {
  const { parsed, where } = catalogueWhere(designations, input);
  const [totalRecord] = await executor.select({ value: count() }).from(designations).where(where);
  const items = await executor.select().from(designations).where(where).orderBy(asc(designations.sortOrder), asc(designations.name), asc(designations.id))
    .limit(parsed.pageSize).offset((parsed.page - 1) * parsed.pageSize);
  return { items, total: Number(totalRecord?.value ?? 0), page: parsed.page, pageSize: parsed.pageSize };
}
async function skillPage(executor: DatabaseExecutor, input: PaginationInput) {
  const { parsed, where } = catalogueWhere(skills, input);
  const [totalRecord] = await executor.select({ value: count() }).from(skills).where(where);
  const items = await executor.select().from(skills).where(where).orderBy(asc(skills.name), asc(skills.id))
    .limit(parsed.pageSize).offset((parsed.page - 1) * parsed.pageSize);
  return { items, total: Number(totalRecord?.value ?? 0), page: parsed.page, pageSize: parsed.pageSize };
}
async function arrangementPage(executor: DatabaseExecutor, input: PaginationInput) {
  const { parsed, where } = catalogueWhere(arrangementLabels, input);
  const [totalRecord] = await executor.select({ value: count() }).from(arrangementLabels).where(where);
  const items = await executor.select().from(arrangementLabels).where(where).orderBy(asc(arrangementLabels.sortOrder), asc(arrangementLabels.name), asc(arrangementLabels.id))
    .limit(parsed.pageSize).offset((parsed.page - 1) * parsed.pageSize);
  return { items, total: Number(totalRecord?.value ?? 0), page: parsed.page, pageSize: parsed.pageSize };
}

async function catalogueByNormalizedName(executor: DatabaseExecutor, table: typeof designations | typeof skills | typeof arrangementLabels, name: string) {
  const [row] = await executor.select().from(table).where(sql`lower(trim(${table.name})) = ${normalizeCatalogueName(name)}`).limit(1);
  return row ?? null;
}

export const designationRepository = {
  getById(executor: DatabaseExecutor, id: string) { return executor.select().from(designations).where(eq(designations.id, id)).limit(1).then(([row]) => row ?? null); },
  getByNormalizedName(executor: DatabaseExecutor, name: string) { return catalogueByNormalizedName(executor, designations, name); },
  list(executor: DatabaseExecutor, input: PaginationInput) { return designationPage(executor, input); },
  async create(executor: DatabaseExecutor, input: { name: string; sortOrder: number }) {
    const [row] = await executor.insert(designations).values(input).returning(); return row!;
  },
  async update(executor: DatabaseExecutor, id: string, expectedVersion: number, input: { name?: string; sortOrder?: number }) {
    const [row] = await executor.update(designations).set({ ...input, version: sql`${designations.version} + 1`, updatedAt: new Date() })
      .where(and(eq(designations.id, id), eq(designations.version, expectedVersion))).returning(); return row ?? null;
  },
  async setActive(executor: DatabaseExecutor, id: string, expectedVersion: number, active: boolean) {
    const [row] = await executor.update(designations).set({ active, archivedAt: active ? null : new Date(), version: sql`${designations.version} + 1`, updatedAt: new Date() })
      .where(and(eq(designations.id, id), eq(designations.version, expectedVersion))).returning(); return row ?? null;
  },
  async isReferenced(executor: DatabaseExecutor, id: string) {
    const [row] = await executor.select({ value: count() }).from(employeeProfiles).where(eq(employeeProfiles.designationId, id)); return Number(row?.value ?? 0) > 0;
  },
};

export const skillRepository = {
  getById(executor: DatabaseExecutor, id: string) { return executor.select().from(skills).where(eq(skills.id, id)).limit(1).then(([row]) => row ?? null); },
  getByNormalizedName(executor: DatabaseExecutor, name: string) { return catalogueByNormalizedName(executor, skills, name); },
  list(executor: DatabaseExecutor, input: PaginationInput) { return skillPage(executor, input); },
  async create(executor: DatabaseExecutor, input: { name: string }) { const [row] = await executor.insert(skills).values(input).returning(); return row!; },
  async update(executor: DatabaseExecutor, id: string, expectedVersion: number, input: { name?: string }) {
    const [row] = await executor.update(skills).set({ ...input, version: sql`${skills.version} + 1`, updatedAt: new Date() })
      .where(and(eq(skills.id, id), eq(skills.version, expectedVersion))).returning(); return row ?? null;
  },
  async setActive(executor: DatabaseExecutor, id: string, expectedVersion: number, active: boolean) {
    const [row] = await executor.update(skills).set({ active, archivedAt: active ? null : new Date(), version: sql`${skills.version} + 1`, updatedAt: new Date() })
      .where(and(eq(skills.id, id), eq(skills.version, expectedVersion))).returning(); return row ?? null;
  },
  async isReferenced(executor: DatabaseExecutor, id: string) {
    const [associationRows, evidenceRows] = await Promise.all([
      executor.select({ value: count() }).from(employeeSkills).where(eq(employeeSkills.skillId, id)),
      executor.select({ value: count() }).from(employeeEvidence).where(eq(employeeEvidence.relatedSkillId, id)),
    ]);
    return Number(associationRows[0]?.value ?? 0) + Number(evidenceRows[0]?.value ?? 0) > 0;
  },
};

export const arrangementLabelRepository = {
  getById(executor: DatabaseExecutor, id: string) { return executor.select().from(arrangementLabels).where(eq(arrangementLabels.id, id)).limit(1).then(([row]) => row ?? null); },
  getByNormalizedName(executor: DatabaseExecutor, name: string) { return catalogueByNormalizedName(executor, arrangementLabels, name); },
  list(executor: DatabaseExecutor, input: PaginationInput) { return arrangementPage(executor, input); },
  async create(executor: DatabaseExecutor, input: { name: string; color: string; sortOrder: number }) { const [row] = await executor.insert(arrangementLabels).values(input).returning(); return row!; },
  async update(executor: DatabaseExecutor, id: string, expectedVersion: number, input: { name?: string; color?: string; sortOrder?: number }) {
    const [row] = await executor.update(arrangementLabels).set({ ...input, version: sql`${arrangementLabels.version} + 1`, updatedAt: new Date() })
      .where(and(eq(arrangementLabels.id, id), eq(arrangementLabels.version, expectedVersion))).returning(); return row ?? null;
  },
  async setActive(executor: DatabaseExecutor, id: string, expectedVersion: number, active: boolean) {
    const [row] = await executor.update(arrangementLabels).set({ active, archivedAt: active ? null : new Date(), version: sql`${arrangementLabels.version} + 1`, updatedAt: new Date() })
      .where(and(eq(arrangementLabels.id, id), eq(arrangementLabels.version, expectedVersion))).returning(); return row ?? null;
  },
  // The certified schema has no assignment-label foreign key. Retained labels are still never deleted.
  async isReferenced(_executor: DatabaseExecutor, _id: string) { return false; },
};

export const employeeProfileRepository = {
  async getByUserId(executor: DatabaseExecutor, userId: string): Promise<ProfileWithUser | null> {
    const [row] = await executor.select({ profile: employeeProfiles, user: users }).from(employeeProfiles).innerJoin(users, eq(employeeProfiles.userId, users.id))
      .where(eq(employeeProfiles.userId, userId)).limit(1);
    return row ? { ...row.profile, user: row.user } : null;
  },
  async findUser(executor: DatabaseExecutor, userId: string) { const [row] = await executor.select().from(users).where(eq(users.id, userId)).limit(1); return row ?? null; },
  async createUser(executor: DatabaseExecutor, input: typeof users.$inferInsert) { const [row] = await executor.insert(users).values(input).returning(); return row!; },
  async findByNormalizedEmployeeCode(executor: DatabaseExecutor, employeeCode: string) {
    const [row] = await executor.select().from(employeeProfiles).where(sql`lower(trim(${employeeProfiles.employeeCode})) = ${normalizeIdentifier(employeeCode)}`).limit(1); return row ?? null;
  },
  async allocateEmployeeCodeNumber(executor: DatabaseExecutor) {
    const [row] = await executor.update(employeeCodeSequence)
      .set({ nextValue: sql`${employeeCodeSequence.nextValue} + 1` })
      .where(and(eq(employeeCodeSequence.singleton, true), lte(employeeCodeSequence.nextValue, 9_999)))
      .returning({ allocated: employeeCodeSequence.nextValue });
    return row ? row.allocated - 1 : null;
  },
  async list(executor: DatabaseExecutor, input: PaginationInput & EmployeeDirectoryQuery & { teams?: string[] }) {
    const parsed = pageInput(input); const conditions = [];
    if (parsed.query) conditions.push(or(ilike(employeeProfiles.employeeCode, `%${parsed.query}%`), ilike(users.displayName, `%${parsed.query}%`)));
    if (input.designationId) conditions.push(eq(employeeProfiles.designationId, input.designationId));
    if (input.team) conditions.push(eq(employeeProfiles.team, input.team));
    if (input.active !== undefined) conditions.push(eq(users.active, input.active));
    if (input.teams) { if (input.teams.length === 0) return { items: [], total: 0, page: parsed.page, pageSize: parsed.pageSize }; conditions.push(inArray(employeeProfiles.team, input.teams)); }
    const where = conditions.length ? and(...conditions) : undefined;
    const [totalRecord] = await executor.select({ value: count() }).from(employeeProfiles).innerJoin(users, eq(employeeProfiles.userId, users.id)).where(where);
    const rows = await executor.select({ profile: employeeProfiles, user: users }).from(employeeProfiles).innerJoin(users, eq(employeeProfiles.userId, users.id)).where(where)
      .orderBy(asc(users.displayName), asc(employeeProfiles.userId)).limit(parsed.pageSize).offset((parsed.page - 1) * parsed.pageSize);
    return { items: rows.map((row) => ({ ...row.profile, user: row.user })), total: Number(totalRecord?.value ?? 0), page: parsed.page, pageSize: parsed.pageSize };
  },
  async listDirectoryFilterOptions(executor: DatabaseExecutor, input: { teams?: string[] }) {
    if (input.teams?.length === 0) return { teams: [], designations: [] };
    const where = input.teams ? inArray(employeeProfiles.team, input.teams) : undefined;
    const rows = await executor.select({ team: employeeProfiles.team, designationId: designations.id, designationName: designations.name })
      .from(employeeProfiles).leftJoin(designations, eq(employeeProfiles.designationId, designations.id)).where(where)
      .orderBy(asc(employeeProfiles.team), asc(designations.name), asc(designations.id));
    const teams = [...new Set(rows.flatMap((row) => row.team ? [row.team] : []))];
    const designationsById = new Map(rows.flatMap((row) => row.designationId && row.designationName ? [[row.designationId, row.designationName] as const] : []));
    return { teams, designations: [...designationsById].map(([id, name]) => ({ id, name })) };
  },
  async create(executor: DatabaseExecutor, input: typeof employeeProfiles.$inferInsert) { const [row] = await executor.insert(employeeProfiles).values(input).returning(); return row!; },
  async update(executor: DatabaseExecutor, userId: string, expectedVersion: number, input: Partial<typeof employeeProfiles.$inferInsert>) {
    const [row] = await executor.update(employeeProfiles).set({ ...input, version: sql`${employeeProfiles.version} + 1`, updatedAt: new Date() })
      .where(and(eq(employeeProfiles.userId, userId), eq(employeeProfiles.version, expectedVersion))).returning(); return row ?? null;
  },
  async setUserActive(executor: DatabaseExecutor, userId: string, active: boolean) {
    const [row] = await executor.update(users).set({ active, version: sql`${users.version} + 1`, updatedAt: new Date() }).where(eq(users.id, userId)).returning(); return row ?? null;
  },
  async updateUser(executor: DatabaseExecutor, userId: string, input: Partial<typeof users.$inferInsert>) {
    const [row] = await executor.update(users).set({ ...input, version: sql`${users.version} + 1`, updatedAt: new Date() }).where(eq(users.id, userId)).returning(); return row ?? null;
  },
  async activeSuperAdminCount(executor: DatabaseExecutor) {
    const [row] = await executor.select({ value: count() }).from(users).where(and(eq(users.role, "SUPER_ADMIN"), eq(users.active, true))); return Number(row?.value ?? 0);
  },
  async revokeSessions(executor: DatabaseExecutor, userId: string) { await executor.update(sessions).set({ revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt))); },
  async listManagementCandidates(executor: DatabaseExecutor, excludeUserId: string) {
    return executor.select({ userId: employeeProfiles.userId, displayName: users.displayName, active: users.active }).from(employeeProfiles).innerJoin(users, eq(employeeProfiles.userId, users.id)).where(sql`${employeeProfiles.userId} <> ${excludeUserId}`).orderBy(asc(users.displayName), asc(employeeProfiles.userId));
  },
  async managerChain(executor: DatabaseExecutor, startUserId: string) {
    const rows = await executor.select({ userId: employeeProfiles.userId, managerUserId: employeeProfiles.managerUserId }).from(employeeProfiles);
    const managerByUser = new Map(rows.map((row) => [row.userId, row.managerUserId])); const chain: string[] = []; const visited = new Set<string>();
    let current: string | null | undefined = startUserId;
    while (current && !visited.has(current)) { visited.add(current); chain.push(current); current = managerByUser.get(current); }
    return { chain, hasExistingCycle: current !== null && current !== undefined };
  },
};

export const adminScopeGrantRepository = {
  get(executor: DatabaseExecutor, userId: string, team: string) {
    return executor.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, userId), eq(adminScopeGrants.scopeType, "TEAM"), eq(adminScopeGrants.scopeReference, team))).limit(1).then(([row]) => row ?? null);
  },
  listForUser(executor: DatabaseExecutor, userId: string) {
    return executor.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, userId), eq(adminScopeGrants.scopeType, "TEAM"))).orderBy(asc(adminScopeGrants.scopeReference));
  },
  async create(executor: DatabaseExecutor, userId: string, team: string) { const [row] = await executor.insert(adminScopeGrants).values({ userId, scopeType: "TEAM", scopeReference: team }).returning(); return row!; },
  async reactivate(executor: DatabaseExecutor, id: string, expectedVersion: number) {
    const [row] = await executor.update(adminScopeGrants).set({ active: true, version: sql`${adminScopeGrants.version} + 1`, updatedAt: new Date() }).where(and(eq(adminScopeGrants.id, id), eq(adminScopeGrants.version, expectedVersion))).returning(); return row ?? null;
  },
  async revoke(executor: DatabaseExecutor, id: string, expectedVersion: number) {
    const [row] = await executor.update(adminScopeGrants).set({ active: false, version: sql`${adminScopeGrants.version} + 1`, updatedAt: new Date() }).where(and(eq(adminScopeGrants.id, id), eq(adminScopeGrants.version, expectedVersion))).returning(); return row ?? null;
  },
};

export const employeeSkillRepository = {
  async getById(executor: DatabaseExecutor, id: string) { const [row] = await executor.select().from(employeeSkills).where(eq(employeeSkills.id, id)).limit(1); return row ?? null; },
  async getByEmployeeAndSkill(executor: DatabaseExecutor, employeeUserId: string, skillId: string) {
    const [row] = await executor.select().from(employeeSkills).where(and(eq(employeeSkills.employeeUserId, employeeUserId), eq(employeeSkills.skillId, skillId))).limit(1); return row ?? null;
  },
  listForEmployee(executor: DatabaseExecutor, employeeUserId: string, includeArchived = false) {
    return executor.select({ association: employeeSkills, skill: skills }).from(employeeSkills).innerJoin(skills, eq(employeeSkills.skillId, skills.id))
      .where(and(eq(employeeSkills.employeeUserId, employeeUserId), ...(includeArchived ? [] : [isNull(employeeSkills.archivedAt)]))).orderBy(asc(skills.name), asc(employeeSkills.id));
  },
  async listEmployeesForSkill(executor: DatabaseExecutor, skillId: string, teams?: string[]) {
    if (teams?.length === 0) return [];
    const conditions = [eq(employeeSkills.skillId, skillId), isNull(employeeSkills.archivedAt)];
    if (teams) conditions.push(inArray(employeeProfiles.team, teams));
    return executor.select({ association: employeeSkills, profile: employeeProfiles, user: users }).from(employeeSkills)
      .innerJoin(employeeProfiles, eq(employeeSkills.employeeUserId, employeeProfiles.userId)).innerJoin(users, eq(employeeProfiles.userId, users.id))
      .where(and(...conditions)).orderBy(asc(users.displayName), asc(employeeSkills.id));
  },
  async create(executor: DatabaseExecutor, input: typeof employeeSkills.$inferInsert) { const [row] = await executor.insert(employeeSkills).values(input).returning(); return row!; },
  async update(executor: DatabaseExecutor, id: string, expectedVersion: number, input: Partial<typeof employeeSkills.$inferInsert>) {
    const [row] = await executor.update(employeeSkills).set({ ...input, version: sql`${employeeSkills.version} + 1`, updatedAt: new Date() })
      .where(and(eq(employeeSkills.id, id), eq(employeeSkills.version, expectedVersion))).returning(); return row ?? null;
  },
  async setArchived(executor: DatabaseExecutor, id: string, expectedVersion: number, archived: boolean) {
    const [row] = await executor.update(employeeSkills).set({ archivedAt: archived ? new Date() : null, version: sql`${employeeSkills.version} + 1`, updatedAt: new Date() })
      .where(and(eq(employeeSkills.id, id), eq(employeeSkills.version, expectedVersion))).returning(); return row ?? null;
  },
};
