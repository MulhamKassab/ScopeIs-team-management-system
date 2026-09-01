import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { auditEvents, employeeProfiles, employeeSkills, users, adminScopeGrants, designations, sessions } from "@/db/schema";
import { EmployeeCatalogueService, EmployeeProfileService, employeeCatalogueService, employeeProfileService, employeeSkillService } from "@/modules/employees/employee-services";
import { designationRepository } from "@/modules/employees/employee-repositories";
import type { EmployeeActor } from "@/modules/employees/contracts";

type Fixture = ReturnType<typeof fixture>;
function actor(id: string, role: EmployeeActor["role"], scopes: EmployeeActor["scopes"] = []): EmployeeActor {
  return { id, role, scopes, displayName: id, sessionId: `session-${id}`, sessionVersion: 1, authenticationMode: "mock" };
}
function fixture() {
  const suffix = randomUUID().replaceAll("-", "");
  const ids = {
    superAdmin: `sa-${suffix}`, adminAlpha: `admin-alpha-${suffix}`, adminBravo: `admin-bravo-${suffix}`,
    employeeAlpha: `employee-alpha-${suffix}`, employeeBravo: `employee-bravo-${suffix}`, employeeExtra: `employee-extra-${suffix}`,
  };
  return {
    ids,
    superAdmin: actor(ids.superAdmin, "SUPER_ADMIN"),
    adminAlpha: actor(ids.adminAlpha, "ADMIN", [{ type: "TEAM", reference: "team:alpha" }]),
    adminBravo: actor(ids.adminBravo, "ADMIN", [{ type: "TEAM", reference: "team:bravo" }]),
    employeeAlpha: actor(ids.employeeAlpha, "EMPLOYEE", [{ type: "TEAM", reference: "team:alpha" }]),
    employeeBravo: actor(ids.employeeBravo, "EMPLOYEE", [{ type: "TEAM", reference: "team:bravo" }]),
  };
}
async function seedProfiles(f: Fixture) {
  await db.insert(users).values([
    { id: f.ids.superAdmin, displayName: "Super Admin", role: "SUPER_ADMIN" }, { id: f.ids.adminAlpha, displayName: "Admin Alpha", role: "ADMIN" },
    { id: f.ids.adminBravo, displayName: "Admin Bravo", role: "ADMIN" }, { id: f.ids.employeeAlpha, displayName: "Employee Alpha", role: "EMPLOYEE" },
    { id: f.ids.employeeBravo, displayName: "Employee Bravo", role: "EMPLOYEE" }, { id: f.ids.employeeExtra, displayName: "Employee Extra", role: "EMPLOYEE" },
  ]);
  await db.insert(adminScopeGrants).values([
    { userId: f.ids.adminAlpha, scopeType: "TEAM", scopeReference: "team:alpha" }, { userId: f.ids.adminBravo, scopeType: "TEAM", scopeReference: "team:bravo" },
  ]);
  await db.insert(employeeProfiles).values([
    { userId: f.ids.employeeAlpha, employeeCode: `ALPHA-${f.ids.employeeAlpha}`, team: "team:alpha", workEmail: "alpha@example.test", workPhone: "100", professionalSummary: "Alpha capability", defaultWorkLocation: "Private work location" },
    { userId: f.ids.employeeBravo, employeeCode: `BRAVO-${f.ids.employeeBravo}`, team: "team:bravo", workEmail: "bravo@example.test", workPhone: "200", professionalSummary: "Bravo capability", defaultWorkLocation: "Private work location" },
  ]);
}

describe("Phase 2 core employee and catalogue services", () => {
  it("enforces global catalogue ownership, normalized duplicates, archival, ordering, and audit", async () => {
    const f = fixture(); await seedProfiles(f);
    const designation = await employeeCatalogueService.createDesignation(f.superAdmin, { name: "  Site   Engineer  ", sortOrder: 2 });
    const skill = await employeeCatalogueService.createSkill(f.superAdmin, { name: "Electrical Safety" });
    const label = await employeeCatalogueService.createArrangementLabel(f.superAdmin, { name: "Weekend", color: "#123456", sortOrder: 5 });
    expect(designation.name).toBe("Site Engineer"); expect(skill.active).toBe(true); expect(label.sortOrder).toBe(5);
    await expect(employeeCatalogueService.createDesignation(f.superAdmin, { name: "site engineer" })).rejects.toMatchObject({ code: "DUPLICATE_NAME" });
    await expect(employeeCatalogueService.createSkill(f.adminAlpha, { name: "Forbidden" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(employeeCatalogueService.createArrangementLabel(f.employeeAlpha, { name: "Forbidden", color: "#000000" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(employeeCatalogueService.createArrangementLabel(f.superAdmin, { name: "Bad colour", color: "red" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const renamed = await employeeCatalogueService.updateArrangementLabel(f.superAdmin, label.id, { expectedVersion: label.version, name: "Weekend rotation", color: "#abcdef", sortOrder: 1 });
    expect(renamed.version).toBe(2);
    const archived = await employeeCatalogueService.setDesignationActive(f.superAdmin, designation.id, designation.version, false);
    expect(archived.active).toBe(false); expect(archived.archivedAt).toBeInstanceOf(Date);
    expect(await employeeCatalogueService.listDesignations(f.employeeAlpha, { includeArchived: true })).toMatchObject({ total: 0 });
    const audits = await db.select().from(auditEvents).where(and(eq(auditEvents.actorUserId, f.superAdmin.id), eq(auditEvents.targetType, "arrangement_label")));
    expect(audits.some((event) => event.action === "arrangement_label.updated")).toBe(true);
  });

  it("enforces profile role/scope isolation, safe projections, self-field boundary, and audit", async () => {
    const f = fixture(); await seedProfiles(f);
    const alphaAdminView = await employeeProfileService.getProfile(f.adminAlpha, f.ids.employeeAlpha);
    expect(alphaAdminView).not.toHaveProperty("workEmail"); expect(alphaAdminView).not.toHaveProperty("defaultWorkLocation");
    await expect(employeeProfileService.getProfile(f.adminBravo, f.ids.employeeAlpha)).rejects.toMatchObject({ code: "OUT_OF_SCOPE", status: 404 });
    await expect(employeeProfileService.getProfile(f.employeeBravo, f.ids.employeeAlpha)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const own = await employeeProfileService.getOwnProfile(f.employeeAlpha);
    expect(own).toHaveProperty("workEmail", "alpha@example.test");
    const updated = await employeeProfileService.updateOwnProfile(f.employeeAlpha, f.ids.employeeAlpha, { expectedVersion: own.version, workPhone: "101" });
    expect(updated.workPhone).toBe("101");
    await expect(employeeProfileService.updateOwnProfile(f.employeeAlpha, f.ids.employeeAlpha, { expectedVersion: updated.version, team: "team:bravo" } as never)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(employeeProfileService.updateManagementProfile(f.adminAlpha, f.ids.employeeAlpha, { expectedVersion: updated.version, team: "team:bravo" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const events = await db.select().from(auditEvents).where(and(eq(auditEvents.actorUserId, f.ids.employeeAlpha), eq(auditEvents.targetId, f.ids.employeeAlpha)));
    expect(events.some((event) => event.action === "employee_profile.self_updated" && !JSON.stringify(event.metadata).includes("101"))).toBe(true);
  });

  it("provides a management-only directory with server-enforced scope and safe Admin projections", async () => {
    const f = fixture(); await seedProfiles(f);
    const globalDirectory = await employeeProfileService.listDirectoryProfiles(f.superAdmin);
    expect(globalDirectory.items.map((profile) => profile.userId)).toEqual(expect.arrayContaining([f.ids.employeeAlpha, f.ids.employeeBravo]));
    const alphaDirectory = await employeeProfileService.listDirectoryProfiles(f.adminAlpha);
    expect(alphaDirectory.items.map((profile) => profile.userId)).toContain(f.ids.employeeAlpha);
    expect(alphaDirectory.items.map((profile) => profile.userId)).not.toContain(f.ids.employeeBravo);
    expect(alphaDirectory.items.every((profile) => profile.team === "team:alpha")).toBe(true);
    const alphaProfile = alphaDirectory.items.find((profile) => profile.userId === f.ids.employeeAlpha);
    expect(alphaProfile).not.toHaveProperty("defaultWorkLocation");
    expect(alphaProfile).not.toHaveProperty("workEmail");
    expect(alphaProfile).not.toHaveProperty("workPhone");
    const noScopeAdmin = actor(`admin-empty-${randomUUID()}`, "ADMIN");
    await db.insert(users).values({ id: noScopeAdmin.id, displayName: "Empty scope Admin", role: "ADMIN" });
    expect((await employeeProfileService.listDirectoryProfiles(noScopeAdmin)).items).toEqual([]);
    await expect(employeeProfileService.listDirectoryProfiles(f.employeeAlpha)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns non-enumerating scoped details with the correct privacy projection", async () => {
    const f = fixture(); await seedProfiles(f);
    const superDetail = await employeeProfileService.getManagementDetail(f.superAdmin, f.ids.employeeAlpha);
    expect(superDetail.workEmail).toBe("alpha@example.test"); expect(superDetail.defaultWorkLocation).toBe("Private work location");
    const adminDetail = await employeeProfileService.getManagementDetail(f.adminAlpha, f.ids.employeeAlpha);
    expect(adminDetail).not.toHaveProperty("workEmail"); expect(adminDetail).not.toHaveProperty("workPhone"); expect(adminDetail).not.toHaveProperty("defaultWorkLocation");
    await expect(employeeProfileService.getManagementDetail(f.adminBravo, f.ids.employeeAlpha)).rejects.toMatchObject({ code: "OUT_OF_SCOPE", status: 404 });
    await expect(employeeProfileService.getManagementDetail(f.employeeAlpha, f.ids.employeeAlpha)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(employeeProfileService.getManagementDetail(f.superAdmin, "not/a-valid-id")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("searches and filters directory records by approved fields without widening Admin scope", async () => {
    const f = fixture(); await seedProfiles(f);
    const designation = await employeeCatalogueService.createDesignation(f.superAdmin, { name: `Field Engineer ${f.ids.superAdmin}` });
    await db.update(employeeProfiles).set({ designationId: designation.id }).where(eq(employeeProfiles.userId, f.ids.employeeAlpha));
    await db.update(users).set({ active: false }).where(eq(users.id, f.ids.employeeBravo));
    const nameSearch = await employeeProfileService.listDirectoryProfiles(f.superAdmin, { query: "Employee Alpha" });
    expect(nameSearch.items.map((profile) => profile.userId)).toContain(f.ids.employeeAlpha);
    const codeSearch = await employeeProfileService.listDirectoryProfiles(f.superAdmin, { query: `ALPHA-${f.ids.employeeAlpha}` });
    expect(codeSearch.items.map((profile) => profile.userId)).toContain(f.ids.employeeAlpha);
    const combined = await employeeProfileService.listDirectoryProfiles(f.superAdmin, { designationId: designation.id, team: "team:alpha", active: true });
    expect(combined.items.map((profile) => profile.userId)).toContain(f.ids.employeeAlpha);
    expect(combined.items.every((profile) => profile.team === "team:alpha" && profile.user.active)).toBe(true);
    const adversarialAdmin = await employeeProfileService.listDirectoryProfiles(f.adminAlpha, { query: "Employee Bravo", team: "team:bravo", active: false });
    expect(adversarialAdmin.items).toEqual([]);
    const scopedOptions = await employeeProfileService.listDirectoryFilterOptions(f.adminAlpha);
    expect(scopedOptions.teams).toEqual(["team:alpha"]);
    expect(scopedOptions.designations).toEqual(expect.arrayContaining([expect.objectContaining({ id: designation.id })]));
    const alpha = await employeeProfileService.listDirectoryProfiles(f.adminAlpha, { team: "team:alpha" });
    expect(alpha.items.every((profile) => profile.team === "team:alpha")).toBe(true);
    expect(alpha.items[0]).not.toHaveProperty("defaultWorkLocation");
    expect(alpha.items[0]).not.toHaveProperty("workEmail");
    expect(alpha.items[0]).not.toHaveProperty("workPhone");
    await expect(employeeProfileService.listDirectoryProfiles(f.superAdmin, { query: "x".repeat(81) })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("creates valid internal profiles, protects manager graphs and stale writes, and preserves deactivation history", async () => {
    const f = fixture(); await seedProfiles(f);
    const designation = await employeeCatalogueService.createDesignation(f.superAdmin, { name: `Planner ${f.ids.superAdmin}` });
    const extra = await employeeProfileService.createProfile(f.superAdmin, { userId: f.ids.employeeExtra, employeeCode: "EXTRA-1", designationId: designation.id, team: "team:alpha" });
    const alpha = await employeeProfileService.getOwnProfile(f.employeeAlpha);
    const alphaManaged = await employeeProfileService.updateManagementProfile(f.superAdmin, f.ids.employeeAlpha, { expectedVersion: alpha.version, managerUserId: f.ids.employeeExtra });
    await expect(employeeProfileService.updateManagementProfile(f.superAdmin, f.ids.employeeExtra, { expectedVersion: extra.version, managerUserId: f.ids.employeeAlpha })).rejects.toMatchObject({ code: "INVALID_MANAGER" });
    await expect(employeeProfileService.updateManagementProfile(f.superAdmin, f.ids.employeeAlpha, { expectedVersion: alpha.version, team: "team:bravo" })).rejects.toMatchObject({ code: "STALE_VERSION" });
    const deactivated = await employeeProfileService.setEmployeeActive(f.superAdmin, f.ids.employeeAlpha, alphaManaged.version, false);
    expect(deactivated.version).toBe(alphaManaged.version + 1);
    const [user] = await db.select().from(users).where(eq(users.id, f.ids.employeeAlpha)); expect(user?.active).toBe(false);
    expect(await db.select().from(auditEvents).where(eq(auditEvents.targetId, f.ids.employeeAlpha))).toEqual(expect.arrayContaining([expect.objectContaining({ action: "employee_profile.deactivated" })]));
  });

  it("creates a Super Admin-only workforce record atomically without provisioning access or auditing sensitive values", async () => {
    const f = fixture(); await seedProfiles(f);
    const employeeCode = `NEW-${f.ids.superAdmin}`;
    const created = await employeeProfileService.createEmployee(f.superAdmin, {
      displayName: "  New   Workforce  Employee ", employeeCode, workEmail: "new.workforce@example.test",
      workPhone: "555-0100", professionalSummary: "Trusted operational summary",
    });
    expect(created.user).toMatchObject({ displayName: "New Workforce Employee", role: "EMPLOYEE", active: true });
    expect(created.profile).toMatchObject({ userId: created.user.id, employeeCode, workEmail: "new.workforce@example.test", workPhone: "555-0100" });
    expect(await db.select().from(sessions).where(eq(sessions.userId, created.user.id))).toEqual([]);
    expect((await employeeProfileService.listDirectoryProfiles(f.superAdmin, { query: employeeCode })).items.map((profile) => profile.userId)).toContain(created.user.id);
    await expect(employeeProfileService.createEmployee(f.adminAlpha, { displayName: "Forbidden Admin", employeeCode: `ADMIN-${f.ids.adminAlpha}` })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(employeeProfileService.createEmployee(f.employeeAlpha, { displayName: "Forbidden Employee", employeeCode: `EMPLOYEE-${f.ids.employeeAlpha}` })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(employeeProfileService.createEmployee(f.superAdmin, { displayName: "Duplicate", employeeCode: employeeCode.toLowerCase() })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(employeeProfileService.createEmployee(f.superAdmin, { displayName: "", employeeCode: "x" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const [event] = await db.select().from(auditEvents).where(and(eq(auditEvents.targetId, created.user.id), eq(auditEvents.action, "employee_profile.created")));
    expect(event?.metadata).toEqual({ fields: ["displayName", "employeeCode"] });
    expect(JSON.stringify(event?.metadata)).not.toContain("new.workforce@example.test");
    expect(JSON.stringify(event?.metadata)).not.toContain("Trusted operational summary");

    const rollbackName = `Rollback Workforce ${f.ids.superAdmin}`;
    const failingAudit = new EmployeeProfileService(async () => { throw new Error("forced employee audit failure"); });
    await expect(failingAudit.createEmployee(f.superAdmin, { displayName: rollbackName, employeeCode: `ROLLBACK-${f.ids.superAdmin}` })).rejects.toThrow("forced employee audit failure");
    expect(await db.select().from(users).where(eq(users.displayName, rollbackName))).toEqual([]);
    expect(await db.select().from(employeeProfiles).where(eq(employeeProfiles.employeeCode, `ROLLBACK-${f.ids.superAdmin}`))).toEqual([]);
  });

  it("governs lifecycle, assignments, roles, explicit Admin TEAM scopes, concurrency, and audit rollback", async () => {
    const f = fixture(); await seedProfiles(f);
    const designation = await employeeCatalogueService.createDesignation(f.superAdmin, { name: `Journey designation ${f.ids.superAdmin}` });
    const alpha = await employeeProfileService.getOwnProfile(f.employeeAlpha);
    const assigned = await employeeProfileService.updateManagementAssignments(f.superAdmin, f.ids.employeeAlpha, {
      expectedVersion: alpha.version, designationId: designation.id, managerUserId: f.ids.employeeBravo, team: "team:alpha", workingPattern: "Hybrid weekdays",
    });
    expect(assigned.workingPattern).toBe("Hybrid weekdays");
    await expect(employeeProfileService.updateManagementAssignments(f.superAdmin, f.ids.employeeBravo, { expectedVersion: 1, managerUserId: f.ids.employeeAlpha })).rejects.toMatchObject({ code: "INVALID_MANAGER" });
    await expect(employeeProfileService.updateManagementAssignments(f.adminAlpha, f.ids.employeeAlpha, { expectedVersion: assigned.version, team: "team:bravo" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const renamed = await employeeProfileService.updateBasicProfile(f.superAdmin, f.ids.employeeAlpha, { expectedVersion: assigned.version, displayName: "Renamed Alpha", employeeCode: `RENAMED-${f.ids.employeeAlpha}`, workEmail: "changed@example.test" });
    expect(renamed.employeeCode).toContain("RENAMED-");
    await expect(employeeProfileService.updateBasicProfile(f.superAdmin, f.ids.employeeAlpha, { expectedVersion: assigned.version, displayName: "Stale" })).rejects.toMatchObject({ code: "STALE_VERSION" });
    await expect(employeeProfileService.updateBasicProfile(f.superAdmin, f.ids.employeeBravo, { expectedVersion: 1, employeeCode: renamed.employeeCode })).rejects.toMatchObject({ code: "CONFLICT" });
    await db.insert(sessions).values({ userId: f.ids.employeeAlpha, tokenHash: `session-${f.ids.employeeAlpha}`, sessionVersion: 1, expiresAt: new Date(Date.now() + 60_000) });
    const deactivated = await employeeProfileService.setEmployeeActive(f.superAdmin, f.ids.employeeAlpha, renamed.version, false);
    expect(deactivated.version).toBe(renamed.version + 1);
    expect((await db.select().from(sessions).where(eq(sessions.userId, f.ids.employeeAlpha)))[0]?.revokedAt).toBeInstanceOf(Date);
    await expect(employeeProfileService.setEmployeeActive(f.superAdmin, f.ids.superAdmin, 1, false)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const reactivated = await employeeProfileService.setEmployeeActive(f.superAdmin, f.ids.employeeAlpha, deactivated.version, true);
    const roleChanged = await employeeProfileService.updateEmployeeRole(f.superAdmin, f.ids.employeeAlpha, { expectedVersion: reactivated.version, role: "ADMIN" });
    expect(roleChanged.version).toBe(reactivated.version + 1);
    expect((await employeeProfileService.listDirectoryProfiles(actor(f.ids.employeeAlpha, "ADMIN"))).items).toEqual([]);
    const grant = await employeeProfileService.grantAdminTeamScope(f.superAdmin, { adminUserId: f.ids.employeeAlpha, team: "team:alpha" });
    const scopedActor = actor(f.ids.employeeAlpha, "ADMIN", [{ type: "TEAM", reference: "team:alpha" }]);
    expect((await employeeProfileService.listDirectoryProfiles(scopedActor)).items.map((item) => item.userId)).toContain(f.ids.employeeAlpha);
    await employeeProfileService.revokeAdminTeamScope(f.superAdmin, grant.id, grant.version);
    await expect(employeeProfileService.grantAdminTeamScope(f.superAdmin, { adminUserId: f.ids.employeeAlpha, team: "team:alpha" })).resolves.toBeTruthy();
    const rollback = new EmployeeProfileService(async () => { throw new Error("forced management audit failure"); });
    const before = await employeeProfileService.getProfile(f.superAdmin, f.ids.employeeBravo);
    await expect(rollback.updateBasicProfile(f.superAdmin, f.ids.employeeBravo, { expectedVersion: before.version, displayName: "Never persisted" })).rejects.toThrow("forced management audit failure");
    expect((await employeeProfileService.getProfile(f.superAdmin, f.ids.employeeBravo)).user.displayName).toBe("Employee Bravo");
    const audits = await db.select().from(auditEvents).where(eq(auditEvents.targetId, f.ids.employeeAlpha));
    expect(JSON.stringify(audits.map((event) => event.metadata))).not.toContain("changed@example.test");
  });

  it("enforces employee-skill scope, duplicate/reference rules, optional proficiency, archive safety, and audit", async () => {
    const f = fixture(); await seedProfiles(f);
    const skill = await employeeCatalogueService.createSkill(f.superAdmin, { name: `First Aid ${f.ids.superAdmin}` });
    const association = await employeeSkillService.add(f.superAdmin, { employeeUserId: f.ids.employeeAlpha, skillId: skill.id, proficiencyDescription: null, experienceDescription: null, coverageEligible: true });
    expect(association.proficiencyDescription).toBeNull();
    const adminRows = await employeeSkillService.listForEmployee(f.adminAlpha, f.ids.employeeAlpha); expect(adminRows).toHaveLength(1);
    const adminSkillMembers = await employeeSkillService.listEmployeesForSkill(f.adminAlpha, skill.id);
    expect(adminSkillMembers[0]?.profile).not.toHaveProperty("defaultWorkLocation");
    expect(adminSkillMembers[0]?.profile).not.toHaveProperty("workEmail");
    expect(adminSkillMembers[0]?.profile).not.toHaveProperty("workPhone");
    await expect(employeeSkillService.listForEmployee(f.adminBravo, f.ids.employeeAlpha)).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await expect(employeeSkillService.add(f.adminAlpha, { employeeUserId: f.ids.employeeAlpha, skillId: skill.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(employeeSkillService.add(f.employeeAlpha, { employeeUserId: f.ids.employeeAlpha, skillId: skill.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(employeeSkillService.add(f.superAdmin, { employeeUserId: f.ids.employeeAlpha, skillId: skill.id })).rejects.toMatchObject({ code: "INVALID_SKILL_ASSOCIATION" });
    const updated = await employeeSkillService.update(f.superAdmin, association.id, { expectedVersion: association.version, notes: "Reviewed capability", verified: true });
    expect(updated.verified).toBe(true);
    const archived = await employeeSkillService.setArchived(f.superAdmin, association.id, updated.version, true); expect(archived.archivedAt).toBeInstanceOf(Date);
    expect(await employeeSkillService.listForEmployee(f.employeeAlpha, f.ids.employeeAlpha)).toHaveLength(0);
    expect(await db.select().from(auditEvents).where(eq(auditEvents.targetId, association.id))).toEqual(expect.arrayContaining([expect.objectContaining({ action: "employee_skill.archived" })]));
  });

  it("rolls back business state when audit persistence fails and repository pagination remains deterministic", async () => {
    const f = fixture(); await seedProfiles(f);
    const failingAudit = new EmployeeCatalogueService(async () => { throw new Error("forced audit failure"); });
    const name = `Rollback designation ${f.ids.superAdmin}`;
    await expect(failingAudit.createDesignation(f.superAdmin, { name })).rejects.toThrow("forced audit failure");
    expect(await db.select().from(designations).where(eq(designations.name, name))).toHaveLength(0);
    await employeeCatalogueService.createDesignation(f.superAdmin, { name: `Find A ${f.ids.superAdmin}`, sortOrder: 2 });
    await employeeCatalogueService.createDesignation(f.superAdmin, { name: `Find B ${f.ids.superAdmin}`, sortOrder: 1 });
    const page = await designationRepository.list(db, { query: `Find`, page: 1, pageSize: 1 });
    expect(page).toMatchObject({ total: 2, page: 1, pageSize: 1 }); expect(page.items[0]?.name).toContain("Find B");
  });
});
