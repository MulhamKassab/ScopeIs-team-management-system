import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { adminScopeGrants, clients, employeeProfiles, locations, operationalContacts, operationalEmployeeRelations, operationalNotes, projectLocations, projects, skills, staffingRequirements, users } from "@/db/schema";

export type OperationalTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type OperationalExecutor = typeof db | OperationalTransaction;
export type ScopeRow = typeof adminScopeGrants.$inferSelect;

export const scopeGrantRepository = {
  activeForUser(executor: OperationalExecutor, userId: string) { return executor.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, userId), eq(adminScopeGrants.active, true))); },
  byId(executor: OperationalExecutor, id: string) { return executor.select().from(adminScopeGrants).where(eq(adminScopeGrants.id, id)).limit(1).then(([row]) => row ?? null); },
  byTarget(executor: OperationalExecutor, userId: string, type: "CLIENT" | "PROJECT" | "LOCATION", reference: string) { return executor.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, userId), eq(adminScopeGrants.scopeType, type), eq(adminScopeGrants.scopeReference, reference))).limit(1).then(([row]) => row ?? null); },
  listOperational(executor: OperationalExecutor) { return executor.select({ grant: adminScopeGrants, user: users }).from(adminScopeGrants).innerJoin(users, eq(users.id, adminScopeGrants.userId)).where(inArray(adminScopeGrants.scopeType, ["CLIENT", "PROJECT", "LOCATION"])).orderBy(asc(users.displayName), asc(adminScopeGrants.scopeType)); },
  create(executor: OperationalExecutor, userId: string, type: "CLIENT" | "PROJECT" | "LOCATION", reference: string) { return executor.insert(adminScopeGrants).values({ userId, scopeType: type, scopeReference: reference }).returning().then(([row]) => row!); },
  reactivate(executor: OperationalExecutor, id: string, expectedVersion: number) { return executor.update(adminScopeGrants).set({ active: true, version: sql`${adminScopeGrants.version} + 1`, updatedAt: new Date() }).where(and(eq(adminScopeGrants.id, id), eq(adminScopeGrants.version, expectedVersion))).returning().then(([row]) => row ?? null); },
  revoke(executor: OperationalExecutor, id: string, expectedVersion: number) { return executor.update(adminScopeGrants).set({ active: false, version: sql`${adminScopeGrants.version} + 1`, updatedAt: new Date() }).where(and(eq(adminScopeGrants.id, id), eq(adminScopeGrants.version, expectedVersion))).returning().then(([row]) => row ?? null); },
};

export const operationalRepository = {
  client(executor: OperationalExecutor, id: string) { return executor.select().from(clients).where(eq(clients.id, id)).limit(1).then(([row]) => row ?? null); },
  project(executor: OperationalExecutor, id: string) { return executor.select().from(projects).where(eq(projects.id, id)).limit(1).then(([row]) => row ?? null); },
  location(executor: OperationalExecutor, id: string) { return executor.select().from(locations).where(eq(locations.id, id)).limit(1).then(([row]) => row ?? null); },
  user(executor: OperationalExecutor, id: string) { return executor.select({ user: users, profile: employeeProfiles }).from(users).leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id)).where(eq(users.id, id)).limit(1).then(([row]) => row ?? null); },
  skill(executor: OperationalExecutor, id: string) { return executor.select().from(skills).where(eq(skills.id, id)).limit(1).then(([row]) => row ?? null); },
  listEmployees(executor: OperationalExecutor) { return executor.select({ id: users.id, displayName: users.displayName, role: users.role }).from(users).innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id)).where(eq(users.active, true)).orderBy(asc(users.displayName)); },
  listSkills(executor: OperationalExecutor) { return executor.select({ id: skills.id, name: skills.name }).from(skills).where(eq(skills.active, true)).orderBy(asc(skills.name)); },
  listClients(executor: OperationalExecutor, input: { query: string; includeArchived: boolean; allowedIds?: string[] }) {
    const conditions = [input.includeArchived ? undefined : eq(clients.status, "ACTIVE"), input.query ? ilike(clients.companyName, `%${input.query}%`) : undefined, input.allowedIds ? (input.allowedIds.length ? inArray(clients.id, input.allowedIds) : sql`false`) : undefined].filter(Boolean);
    return executor.select().from(clients).where(conditions.length ? and(...conditions as never[]) : undefined).orderBy(asc(clients.companyName));
  },
  listProjects(executor: OperationalExecutor, input: { query: string; includeArchived: boolean; clientIds?: string[]; projectIds?: string[] }) {
    const scopePredicates = [input.clientIds?.length ? inArray(projects.clientId, input.clientIds) : undefined, input.projectIds?.length ? inArray(projects.id, input.projectIds) : undefined].filter(Boolean);
    const scope = input.clientIds !== undefined || input.projectIds !== undefined ? (scopePredicates.length ? or(...scopePredicates as never[]) : sql`false`) : undefined;
    const conditions = [input.includeArchived ? undefined : ne(projects.status, "ARCHIVED"), input.query ? ilike(projects.name, `%${input.query}%`) : undefined, scope].filter(Boolean);
    return executor.select({ project: projects, clientName: clients.companyName }).from(projects).innerJoin(clients, eq(clients.id, projects.clientId)).where(conditions.length ? and(...conditions as never[]) : undefined).orderBy(asc(clients.companyName), asc(projects.name));
  },
  listLocations(executor: OperationalExecutor, input: { query: string; includeArchived: boolean; clientIds?: string[]; locationIds?: string[]; clientId?: string }) {
    const scopePredicates = [input.clientIds?.length ? inArray(locations.clientId, input.clientIds) : undefined, input.locationIds?.length ? inArray(locations.id, input.locationIds) : undefined].filter(Boolean);
    const scope = input.clientIds !== undefined || input.locationIds !== undefined ? (scopePredicates.length ? or(...scopePredicates as never[]) : sql`false`) : undefined;
    const search = input.query ? or(ilike(locations.name, `%${input.query}%`), ilike(locations.address, `%${input.query}%`)) : undefined;
    const conditions = [input.includeArchived ? undefined : eq(locations.status, "ACTIVE"), input.clientId ? eq(locations.clientId, input.clientId) : undefined, search, scope].filter(Boolean);
    return executor.select({ location: locations, clientName: clients.companyName }).from(locations).innerJoin(clients, eq(clients.id, locations.clientId)).where(conditions.length ? and(...conditions as never[]) : undefined).orderBy(asc(clients.companyName), asc(locations.name));
  },
  createClient(executor: OperationalExecutor, values: typeof clients.$inferInsert) { return executor.insert(clients).values(values).returning().then(([row]) => row!); },
  createProject(executor: OperationalExecutor, values: typeof projects.$inferInsert) { return executor.insert(projects).values(values).returning().then(([row]) => row!); },
  createLocation(executor: OperationalExecutor, values: typeof locations.$inferInsert) { return executor.insert(locations).values(values).returning().then(([row]) => row!); },
  updateClient(executor: OperationalExecutor, id: string, expectedVersion: number, values: Partial<typeof clients.$inferInsert>) { return executor.update(clients).set({ ...values, version: sql`${clients.version} + 1`, updatedAt: new Date() }).where(and(eq(clients.id, id), eq(clients.version, expectedVersion))).returning().then(([row]) => row ?? null); },
  updateProject(executor: OperationalExecutor, id: string, expectedVersion: number, values: Partial<typeof projects.$inferInsert>) { return executor.update(projects).set({ ...values, version: sql`${projects.version} + 1`, updatedAt: new Date() }).where(and(eq(projects.id, id), eq(projects.version, expectedVersion))).returning().then(([row]) => row ?? null); },
  updateLocation(executor: OperationalExecutor, id: string, expectedVersion: number, values: Partial<typeof locations.$inferInsert>) { return executor.update(locations).set({ ...values, version: sql`${locations.version} + 1`, updatedAt: new Date() }).where(and(eq(locations.id, id), eq(locations.version, expectedVersion))).returning().then(([row]) => row ?? null); },
  unfinishedProjectCount(executor: OperationalExecutor, clientId: string) { return executor.select({ count: sql<number>`count(*)::int` }).from(projects).where(and(eq(projects.clientId, clientId), ne(projects.status, "COMPLETED"), ne(projects.status, "ARCHIVED"))).then(([row]) => row?.count ?? 0); },
  projectLocation(executor: OperationalExecutor, projectId: string, locationId: string) { return executor.select().from(projectLocations).where(and(eq(projectLocations.projectId, projectId), eq(projectLocations.locationId, locationId))).limit(1).then(([row]) => row ?? null); },
  createProjectLocation(executor: OperationalExecutor, projectId: string, locationId: string) { return executor.insert(projectLocations).values({ projectId, locationId }).returning().then(([row]) => row!); },
  setProjectLocationArchived(executor: OperationalExecutor, id: string, expectedVersion: number, archived: boolean) { return executor.update(projectLocations).set({ archivedAt: archived ? new Date() : null, version: sql`${projectLocations.version} + 1`, updatedAt: new Date() }).where(and(eq(projectLocations.id, id), eq(projectLocations.version, expectedVersion))).returning().then(([row]) => row ?? null); },
  linkedLocations(executor: OperationalExecutor, projectId: string) { return executor.select({ relation: projectLocations, location: locations }).from(projectLocations).innerJoin(locations, eq(locations.id, projectLocations.locationId)).where(and(eq(projectLocations.projectId, projectId), isNull(projectLocations.archivedAt))).orderBy(asc(locations.name)); },
  relatedProjects(executor: OperationalExecutor, locationId: string) { return executor.select({ relation: projectLocations, project: projects }).from(projectLocations).innerJoin(projects, eq(projects.id, projectLocations.projectId)).where(and(eq(projectLocations.locationId, locationId), isNull(projectLocations.archivedAt))).orderBy(asc(projects.name)); },
  createContact(executor: OperationalExecutor, values: typeof operationalContacts.$inferInsert) { return executor.insert(operationalContacts).values(values).returning().then(([row]) => row!); },
  createRequirement(executor: OperationalExecutor, values: typeof staffingRequirements.$inferInsert) { return executor.insert(staffingRequirements).values(values).returning().then(([row]) => row!); },
  findEmployeeRelation(executor: OperationalExecutor, target: { clientId?: string; projectId?: string; locationId?: string }, employeeUserId: string) { return executor.select().from(operationalEmployeeRelations).where(and(target.clientId ? eq(operationalEmployeeRelations.clientId, target.clientId) : target.projectId ? eq(operationalEmployeeRelations.projectId, target.projectId) : eq(operationalEmployeeRelations.locationId, target.locationId!), eq(operationalEmployeeRelations.employeeUserId, employeeUserId))).limit(1).then(([row]) => row ?? null); },
  createEmployeeRelation(executor: OperationalExecutor, values: typeof operationalEmployeeRelations.$inferInsert) { return executor.insert(operationalEmployeeRelations).values(values).returning().then(([row]) => row!); },
  reactivateEmployeeRelation(executor: OperationalExecutor, id: string, expectedVersion: number) { return executor.update(operationalEmployeeRelations).set({ archivedAt: null, version: sql`${operationalEmployeeRelations.version} + 1`, updatedAt: new Date() }).where(and(eq(operationalEmployeeRelations.id, id), eq(operationalEmployeeRelations.version, expectedVersion))).returning().then(([row]) => row ?? null); },
  createNote(executor: OperationalExecutor, values: typeof operationalNotes.$inferInsert) { return executor.insert(operationalNotes).values(values).returning().then(([row]) => row!); },
  note(executor: OperationalExecutor, id: string) { return executor.select().from(operationalNotes).where(eq(operationalNotes.id, id)).limit(1).then(([row]) => row ?? null); },
  updateNote(executor: OperationalExecutor, id: string, expectedVersion: number, content: string) { return executor.update(operationalNotes).set({ content, version: sql`${operationalNotes.version} + 1`, updatedAt: new Date() }).where(and(eq(operationalNotes.id, id), eq(operationalNotes.version, expectedVersion), isNull(operationalNotes.archivedAt))).returning().then(([row]) => row ?? null); },
  archiveNote(executor: OperationalExecutor, id: string, expectedVersion: number, actorId: string, reason: string) { return executor.update(operationalNotes).set({ archivedAt: new Date(), archivedByUserId: actorId, archiveReason: reason, version: sql`${operationalNotes.version} + 1`, updatedAt: new Date() }).where(and(eq(operationalNotes.id, id), eq(operationalNotes.version, expectedVersion), isNull(operationalNotes.archivedAt))).returning().then(([row]) => row ?? null); },
  archiveSupporting(executor: OperationalExecutor, kind: "CONTACT" | "REQUIREMENT" | "EMPLOYEE_RELATION", id: string, expectedVersion: number) {
    const table = kind === "CONTACT" ? operationalContacts : kind === "REQUIREMENT" ? staffingRequirements : operationalEmployeeRelations;
    return executor.update(table).set({ archivedAt: new Date(), version: sql`${table.version} + 1`, updatedAt: new Date() }).where(and(eq(table.id, id), eq(table.version, expectedVersion), isNull(table.archivedAt))).returning().then(([row]) => row ?? null);
  },
  supportingById(executor: OperationalExecutor, kind: "CONTACT" | "REQUIREMENT" | "EMPLOYEE_RELATION", id: string) { const table = kind === "CONTACT" ? operationalContacts : kind === "REQUIREMENT" ? staffingRequirements : operationalEmployeeRelations; return executor.select().from(table).where(eq(table.id, id)).limit(1).then(([row]) => row ?? null); },
  details(executor: OperationalExecutor, target: { type: "CLIENT" | "PROJECT" | "LOCATION"; id: string }) {
    const condition = target.type === "CLIENT" ? eq(operationalContacts.clientId, target.id) : target.type === "PROJECT" ? eq(operationalContacts.projectId, target.id) : eq(operationalContacts.locationId, target.id);
    const reqCondition = target.type === "CLIENT" ? eq(staffingRequirements.clientId, target.id) : target.type === "PROJECT" ? eq(staffingRequirements.projectId, target.id) : eq(staffingRequirements.locationId, target.id);
    const employeeCondition = target.type === "CLIENT" ? eq(operationalEmployeeRelations.clientId, target.id) : target.type === "PROJECT" ? eq(operationalEmployeeRelations.projectId, target.id) : eq(operationalEmployeeRelations.locationId, target.id);
    const noteCondition = target.type === "CLIENT" ? eq(operationalNotes.clientId, target.id) : target.type === "PROJECT" ? eq(operationalNotes.projectId, target.id) : eq(operationalNotes.locationId, target.id);
    return Promise.all([
      executor.select().from(operationalContacts).where(and(condition, isNull(operationalContacts.archivedAt))).orderBy(asc(operationalContacts.name)),
      executor.select({ requirement: staffingRequirements, skillName: skills.name }).from(staffingRequirements).innerJoin(skills, eq(skills.id, staffingRequirements.requiredSkillId)).where(and(reqCondition, isNull(staffingRequirements.archivedAt))).orderBy(asc(skills.name)),
      executor.select({ relation: operationalEmployeeRelations, displayName: users.displayName }).from(operationalEmployeeRelations).innerJoin(users, eq(users.id, operationalEmployeeRelations.employeeUserId)).where(and(employeeCondition, isNull(operationalEmployeeRelations.archivedAt))).orderBy(asc(users.displayName)),
      executor.select({ note: operationalNotes, authorName: users.displayName }).from(operationalNotes).innerJoin(users, eq(users.id, operationalNotes.authorUserId)).where(and(noteCondition, isNull(operationalNotes.archivedAt))).orderBy(desc(operationalNotes.createdAt)),
    ]).then(([contacts, requirements, employees, notes]) => ({ contacts, requirements, employees, notes }));
  },
};
