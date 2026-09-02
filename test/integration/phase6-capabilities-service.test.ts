import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { adminScopeGrants } from "@/db/schema";
import { capabilityRepository } from "@/modules/capabilities/repositories";
import { CapabilityService, capabilityService } from "@/modules/capabilities/service";
import { employeeCatalogueService, employeeSkillService } from "@/modules/employees/employee-services";
import { operationalService } from "@/modules/operations/service";
import { schedulingService } from "@/modules/scheduling/service";
import { phase3Ids } from "../../scripts/phase4-test-fixtures.mjs";
import type { AuthenticatedActor } from "@/shared/types/foundation";

const actor = (id: string, role: AuthenticatedActor["role"]): AuthenticatedActor => ({ id, role, displayName: id, sessionId: `s-${id}`, sessionVersion: 1, scopes: [], authenticationMode: "mock" });
const nora = actor("mock-super-admin-nora", "SUPER_ADMIN"), ava = actor("mock-admin-ava", "ADMIN"), cora = actor("mock-employee-cora", "EMPLOYEE"), dan = actor("mock-employee-dan", "EMPLOYEE");

describe("Phase 6 skills and operational capabilities", () => {
  it("records controlled skills, keeps them private, and does not let operational scope expand Team visibility", async () => {
    const skill = await employeeCatalogueService.createSkill(nora, { name: "Phase 6 Recorded Skill" });
    const association = await employeeSkillService.add(nora, { employeeUserId: cora.id, skillId: skill.id });
    expect((await employeeSkillService.listForEmployee(cora, cora.id)).map(({ skill: item }) => item.name)).toContain(skill.name);
    await expect(employeeSkillService.listForEmployee(cora, dan.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(employeeSkillService.add(ava, { employeeUserId: cora.id, skillId: skill.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.delete(adminScopeGrants).where(and(eq(adminScopeGrants.userId, ava.id), eq(adminScopeGrants.scopeType, "TEAM")));
    expect((await capabilityService.plannerCandidates(ava, { skillId: skill.id })).candidates).toEqual([]);
    await db.insert(adminScopeGrants).values({ userId: ava.id, scopeType: "TEAM", scopeReference: "team:alpha" });
    expect((await capabilityService.plannerCandidates(ava, { skillId: skill.id })).candidates.map((item) => item.id)).toEqual([cora.id]);
    await expect(capabilityService.plannerCandidates(cora, { skillId: skill.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await employeeCatalogueService.setSkillActive(nora, skill.id, skill.version, false);
    await expect(employeeSkillService.add(nora, { employeeUserId: dan.id, skillId: skill.id })).rejects.toMatchObject({ code: "INACTIVE_REFERENCE" });
    expect((await employeeSkillService.listForEmployee(cora, cora.id)).find(({ association: item }) => item.id === association.id)).toBeTruthy();
  });

  it("unions Client, Project, Location, and assignment requirements and leaves the schedule lifecycle non-blocking", async () => {
    const clientSkill = await employeeCatalogueService.createSkill(nora, { name: "Phase 6 Client Requirement" });
    const projectSkill = await employeeCatalogueService.createSkill(nora, { name: "Phase 6 Project Requirement" });
    const locationSkill = await employeeCatalogueService.createSkill(nora, { name: "Phase 6 Location Requirement" });
    const assignmentSkill = await employeeCatalogueService.createSkill(nora, { name: "Phase 6 Assignment Requirement" });
    await employeeSkillService.add(nora, { employeeUserId: cora.id, skillId: clientSkill.id });
    await operationalService.addRequirement(nora, { type: "CLIENT", id: phase3Ids.alphaClient, requiredSkillId: clientSkill.id, requiredEmployeeCount: 1 });
    await operationalService.addRequirement(nora, { type: "PROJECT", id: phase3Ids.alphaProjectOne, requiredSkillId: projectSkill.id, requiredEmployeeCount: 1 });
    await operationalService.addRequirement(nora, { type: "LOCATION", id: phase3Ids.alphaLocation, requiredSkillId: locationSkill.id, requiredEmployeeCount: 1 });
    const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2027-02" });
    const assignment = await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: cora.id, projectId: phase3Ids.alphaProjectOne, locationId: phase3Ids.alphaLocation, assignmentDate: "2027-02-10", startTime: "09:00", endTime: "10:00" });
    const direct = await capabilityService.addAssignmentRequirement(nora, { assignmentId: assignment.id, skillId: assignmentSkill.id });
    const effective = await capabilityService.effectiveRequirements(db, assignment.id);
    expect(effective.requirements.find((item) => item.name === clientSkill.name)?.sources).toEqual(["Client"]);
    expect(effective.requirements.find((item) => item.name === projectSkill.name)?.sources).toEqual(["Project"]);
    expect(effective.requirements.find((item) => item.name === locationSkill.name)?.sources).toEqual(["Location"]);
    expect(effective.requirements.find((item) => item.name === assignmentSkill.name)?.sources).toEqual(["Assignment"]);
    const warning = await capabilityService.missingWarning(db, assignment.id);
    expect(warning?.employeeName).toBe("Cora Bell");
    expect(warning?.missingSkills.map((item) => item.name)).toEqual(expect.arrayContaining([projectSkill.name, locationSkill.name, assignmentSkill.name]));
    expect((await schedulingService.getPeriodEditor(nora, period.id)).warnings).toHaveLength(1);
    const archived = await capabilityService.archiveAssignmentRequirement(nora, { requirementId: direct.row.id, expectedVersion: direct.row.version });
    await expect(capabilityService.archiveAssignmentRequirement(nora, { requirementId: direct.row.id, expectedVersion: direct.row.version })).rejects.toMatchObject({ code: "STALE_VERSION" });
    expect(archived.archivedAt).toBeTruthy();
    const proposed = await schedulingService.propose(nora, { periodId: period.id, expectedVersion: period.version + 1 });
    await expect(schedulingService.publish(nora, { periodId: proposed.id, expectedVersion: proposed.version })).resolves.toMatchObject({ status: "PUBLISHED" });
    expect(await schedulingService.getMySchedule(cora, { month: "2027-02" })).toHaveLength(1);
  });

  it("enforces Draft scope and rolls back an assignment requirement when its audit write fails", async () => {
    const skill = await employeeCatalogueService.createSkill(nora, { name: "Phase 6 Audit Rollback" });
    const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2027-03" });
    const assignment = await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: cora.id, projectId: phase3Ids.alphaProjectOne, locationId: phase3Ids.alphaLocation, assignmentDate: "2027-03-10", startTime: "09:00", endTime: "10:00" });
    await expect(capabilityService.addAssignmentRequirement(cora, { assignmentId: assignment.id, skillId: skill.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const failing = new CapabilityService(async () => { throw new Error("forced Phase 6 audit failure"); });
    await expect(failing.addAssignmentRequirement(nora, { assignmentId: assignment.id, skillId: skill.id })).rejects.toThrow("forced Phase 6 audit failure");
    expect((await capabilityRepository.assignmentRequirements(db, assignment.id)).filter((item) => item.requirement.skillId === skill.id)).toHaveLength(0);
    await db.delete(adminScopeGrants).where(eq(adminScopeGrants.userId, ava.id));
  });
});
