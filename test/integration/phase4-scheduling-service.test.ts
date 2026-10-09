import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { adminScopeGrants, assignmentSkillRequirements, auditEvents, clients, locations, notifications, projectLocations, projects, scheduleAssignments, schedulePeriods, skills, users } from "@/db/schema";
import { phase3Ids, phase4Ids } from "../../scripts/phase4-test-fixtures.mjs";
import { SchedulingService, schedulingService } from "@/modules/scheduling/service";
import { coverageRepository } from "@/modules/coverage/repositories";
import type { AuthenticatedActor } from "@/shared/types/foundation";

const actor = (id: string, role: AuthenticatedActor["role"]): AuthenticatedActor => ({ id, role, displayName: id, sessionId: `session-${id}`, sessionVersion: 1, scopes: [], authenticationMode: "mock" });
const nora = actor("mock-super-admin-nora", "SUPER_ADMIN"); const ava = actor("mock-admin-ava", "ADMIN"); const ben = actor("mock-admin-ben", "ADMIN"); const unscoped = actor("mock-employee-dan", "ADMIN"); const cora = actor("mock-employee-cora", "EMPLOYEE");
let alphaProject: { id: string; clientId: string };

beforeAll(async () => { const [project] = await db.select({ id: projects.id, clientId: projects.clientId }).from(projects).where(eq(projects.id, phase3Ids.alphaProjectOne)); alphaProject = project!; });

describe("Phase 4 scheduling service", () => {
  it("completes Draft → Proposed → Published and exposes only the employee projection", async () => {
    const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2026-05" });
    const assignment = await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: "mock-employee-cora", projectId: alphaProject.id, locationId: phase3Ids.alphaLocation, assignmentDate: "2026-05-06", startTime: "09:00", endTime: "10:00", sharedInstruction: "Use the reception desk." });
    const proposed = await schedulingService.propose(nora, { periodId: period.id, expectedVersion: period.version + 1 });
    await expect(schedulingService.publish(ava, { periodId: period.id, expectedVersion: proposed.version })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const published = await schedulingService.publish(nora, { periodId: period.id, expectedVersion: proposed.version });
    expect(published.status).toBe("PUBLISHED"); expect(assignment.employeeUserId).toBe("mock-employee-cora");
    const mine = await schedulingService.getMySchedule(cora, { month: "2026-05" });
    expect(mine).toHaveLength(1); expect(mine[0]).toMatchObject({ clientName: "Alpha Facilities", projectName: "Alpha Modernization", locationName: "Alpha Shared Site" }); expect(mine[0]).not.toHaveProperty("address");
    expect(await db.select().from(notifications).where(and(eq(notifications.recipientUserId, cora.id), eq(notifications.eventType, "schedule.published")))).toHaveLength(1);
  });

  it("keeps Admin schedule reads scoped while refusing Draft creation and edits", async () => {
    const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.bravoClient, month: "2026-06" });
    const assignment = await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: phase4Ids.bravoEmployee, projectId: phase3Ids.bravoProject, locationId: phase3Ids.bravoLocation, assignmentDate: "2026-06-10", startTime: "11:00", endTime: "12:00" });
    expect(assignment.projectId).toBe(phase3Ids.bravoProject);
    const editor = await schedulingService.getPeriodEditor(ben, period.id);
    expect(editor.assignments.map((row) => row.assignment.id)).toEqual([assignment.id]);
    expect(editor).toMatchObject({ canManage: false, canPropose: false, canPublish: false });
    await expect(schedulingService.getPeriodEditor(ava, period.id)).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await expect(schedulingService.createPeriod(ben, { clientId: phase3Ids.bravoClient, month: "2026-07" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(schedulingService.propose(ben, { periodId: period.id, expectedVersion: period.version + 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(schedulingService.addAssignment(ben, { periodId: period.id, expectedPeriodVersion: period.version + 1, employeeUserId: phase4Ids.bravoEmployee, projectId: alphaProject.id, locationId: phase3Ids.alphaLocation, assignmentDate: "2026-06-11", startTime: "11:00", endTime: "12:00" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(schedulingService.createPeriod(unscoped, { clientId: phase3Ids.alphaClient, month: "2026-08" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(schedulingService.getMySchedule(cora, { month: "2026-06" })).resolves.toHaveLength(0);
  });

  it("blocks invalid relationships, stale writes, overlaps, and self-conflict from a copied predecessor", async () => {
    const source = await db.select().from(schedulePeriods).where(and(eq(schedulePeriods.clientId, phase3Ids.alphaClient), eq(schedulePeriods.status, "PUBLISHED"), eq(schedulePeriods.isCurrent, true))).limit(1).then(([row]) => row!);
    const draft = await schedulingService.createRevision(nora, { periodId: source.id, expectedVersion: source.version });
    await expect(schedulingService.addAssignment(nora, { periodId: draft.id, expectedPeriodVersion: draft.version, employeeUserId: "mock-employee-cora", projectId: alphaProject.id, locationId: phase3Ids.alphaLocation, assignmentDate: "2026-05-06", startTime: "09:30", endTime: "10:30" })).rejects.toMatchObject({ code: "OVERLAP" });
    await expect(schedulingService.addAssignment(nora, { periodId: draft.id, expectedPeriodVersion: draft.version, employeeUserId: "mock-employee-cora", projectId: phase3Ids.bravoProject, locationId: phase3Ids.bravoLocation, assignmentDate: "2026-05-15", startTime: "09:00", endTime: "10:00" })).rejects.toMatchObject({ code: "INVALID_RELATIONSHIP" });
    const added = await schedulingService.addAssignment(nora, { periodId: draft.id, expectedPeriodVersion: draft.version, employeeUserId: "mock-employee-cora", projectId: alphaProject.id, locationId: phase3Ids.alphaLocation, assignmentDate: "2026-05-15", startTime: "11:00", endTime: "12:00" });
    await expect(schedulingService.addAssignment(nora, { periodId: draft.id, expectedPeriodVersion: draft.version, employeeUserId: "mock-employee-cora", projectId: alphaProject.id, locationId: phase3Ids.alphaLocation, assignmentDate: "2026-05-16", startTime: "11:00", endTime: "12:00" })).rejects.toMatchObject({ code: "STALE_VERSION" });
    await expect(schedulingService.updateAssignment(nora, { assignmentId: added.id, periodId: draft.id, expectedVersion: added.version, expectedPeriodVersion: draft.version, employeeUserId: "mock-employee-cora", projectId: alphaProject.id, locationId: phase3Ids.alphaLocation, assignmentDate: "2026-05-15", startTime: "11:00", endTime: "12:00" })).rejects.toMatchObject({ code: "STALE_VERSION" });
  });

  it("serializes concurrent cross-client overlap submissions", async () => {
    const alpha = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2027-01" });
    const bravo = await schedulingService.createPeriod(nora, { clientId: phase3Ids.bravoClient, month: "2027-01" });
    const results = await Promise.allSettled([
      schedulingService.addAssignment(nora, { periodId: alpha.id, expectedPeriodVersion: alpha.version, employeeUserId: cora.id, projectId: alphaProject.id, locationId: phase3Ids.alphaLocation, assignmentDate: "2027-01-12", startTime: "09:00", endTime: "10:00" }),
      schedulingService.addAssignment(nora, { periodId: bravo.id, expectedPeriodVersion: bravo.version, employeeUserId: cora.id, projectId: phase3Ids.bravoProject, locationId: phase3Ids.bravoLocation, assignmentDate: "2027-01-12", startTime: "09:00", endTime: "10:00" }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({ reason: { code: "OVERLAP" } });
  });

  it("rolls back schedule-period creation when audit persistence fails", async () => {
    const [client] = await db.select().from(clients).where(eq(clients.id, phase3Ids.gammaClient));
    const failing = new SchedulingService(async () => { throw new Error("forced Phase 4 audit failure"); });
    await expect(failing.createPeriod(nora, { clientId: client.id, month: `2027-${String((Date.now() % 9) + 1).padStart(2, "0")}` })).rejects.toThrow("forced Phase 4 audit failure");
    expect(await db.select().from(schedulePeriods).where(eq(schedulePeriods.clientId, client.id))).toHaveLength(0);
    expect(await db.select().from(auditEvents).where(eq(auditEvents.action, "schedule.created"))).not.toHaveLength(0);
  });
});

describe("Schedule revision and scope regressions", () => {
  it("publishes successive unchanged revisions and releases historical assignment slots", async () => {
    const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2031-01" });
    const input = { employeeUserId: cora.id, projectId: phase3Ids.alphaProjectOne, locationId: phase3Ids.alphaLocation, assignmentDate: "2031-01-13", startTime: "09:00", endTime: "10:00" };
    await schedulingService.addAssignment(nora, { ...input, periodId: period.id, expectedPeriodVersion: period.version });
    const proposed = await schedulingService.propose(nora, { periodId: period.id, expectedVersion: period.version + 1 });
    const first = await schedulingService.publish(nora, { periodId: proposed.id, expectedVersion: proposed.version });
    const revision = await schedulingService.createRevision(nora, { periodId: first.id, expectedVersion: first.version });
    const copied = (await schedulingService.getPeriodEditor(nora, revision.id)).assignments[0].assignment;
    await schedulingService.updateAssignment(nora, { ...input, assignmentId: copied.id, periodId: revision.id, expectedVersion: copied.version, expectedPeriodVersion: revision.version, sharedInstruction: "Updated reception instruction" });
    const secondProposal = await schedulingService.propose(nora, { periodId: revision.id, expectedVersion: revision.version + 1 });
    const second = await schedulingService.publish(nora, { periodId: secondProposal.id, expectedVersion: secondProposal.version });
    const thirdDraft = await schedulingService.createRevision(nora, { periodId: second.id, expectedVersion: second.version });
    const thirdProposal = await schedulingService.propose(nora, { periodId: thirdDraft.id, expectedVersion: thirdDraft.version });
    const third = await schedulingService.publish(nora, { periodId: thirdProposal.id, expectedVersion: thirdProposal.version });
    expect((await schedulingService.getMySchedule(cora, { month: "2031-01" })).map((row) => row.assignment.schedulePeriodId)).toEqual([third.id]);
    const removalDraft = await schedulingService.createRevision(nora, { periodId: third.id, expectedVersion: third.version });
    const removed = (await schedulingService.getPeriodEditor(nora, removalDraft.id)).assignments[0].assignment;
    await schedulingService.removeAssignment(nora, { assignmentId: removed.id, periodId: removalDraft.id, expectedVersion: removed.version, expectedPeriodVersion: removalDraft.version });
    const removalProposal = await schedulingService.propose(nora, { periodId: removalDraft.id, expectedVersion: removalDraft.version + 1 });
    await schedulingService.publish(nora, { periodId: removalProposal.id, expectedVersion: removalProposal.version });
    expect(await coverageRepository.overlaps(db, cora.id, input.assignmentDate, input.startTime, input.endTime)).toBe(false);
    const other = await schedulingService.createPeriod(nora, { clientId: phase3Ids.bravoClient, month: "2031-01" });
    await expect(schedulingService.addAssignment(nora, { ...input, projectId: phase3Ids.bravoProject, locationId: phase3Ids.bravoLocation, periodId: other.id, expectedPeriodVersion: other.version })).resolves.toMatchObject({ employeeUserId: cora.id });
    expect(await coverageRepository.overlaps(db, cora.id, input.assignmentDate, input.startTime, input.endTime)).toBe(true);
    expect((await schedulingService.getPeriodEditor(nora, first.id)).assignments).toHaveLength(1);
  });

  it("keeps original assignment and destination unchanged after an Admin edit attempt", async () => {
    const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.bravoClient, month: "2031-02" });
    await db.insert(projectLocations).values({ projectId: phase3Ids.bravoSibling, locationId: phase3Ids.bravoLocation });
    const original = await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: phase4Ids.bravoEmployee, projectId: phase3Ids.bravoSibling, locationId: phase3Ids.bravoLocation, assignmentDate: "2031-02-03", startTime: "09:00", endTime: "10:00" });
    await expect(schedulingService.updateAssignment(ben, { periodId: period.id, assignmentId: original.id, expectedPeriodVersion: period.version + 1, expectedVersion: original.version, employeeUserId: phase4Ids.bravoEmployee, projectId: phase3Ids.bravoProject, locationId: phase3Ids.bravoLocation, assignmentDate: original.assignmentDate, startTime: "09:00", endTime: "10:00" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await schedulingService.getPeriodEditor(nora, period.id)).assignments[0].assignment).toMatchObject({ projectId: phase3Ids.bravoSibling, version: original.version });
  });

  it("copies active assignment requirements without altering archived or Published history", async () => {
    const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2031-03" });
    const assignment = await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: cora.id, projectId: phase3Ids.alphaProjectOne, locationId: phase3Ids.alphaLocation, assignmentDate: "2031-03-03", startTime: "09:00", endTime: "10:00" });
    const [active, archived] = await db.insert(skills).values([{ name: "Revision active requirement" }, { name: "Revision archived requirement" }]).returning();
    await db.insert(assignmentSkillRequirements).values([{ scheduleAssignmentId: assignment.id, skillId: active.id }, { scheduleAssignmentId: assignment.id, skillId: archived.id, archivedAt: new Date() }]);
    const proposed = await schedulingService.propose(nora, { periodId: period.id, expectedVersion: period.version + 1 });
    const published = await schedulingService.publish(nora, { periodId: proposed.id, expectedVersion: proposed.version });
    const revision = await schedulingService.createRevision(nora, { periodId: published.id, expectedVersion: published.version });
    const editor = await schedulingService.getPeriodEditor(nora, revision.id);
    expect(editor.assignments[0].requirements.map((row) => row.requirement.skillId)).toEqual([active.id]);
    await expect(schedulingService.removeAssignment(nora, { assignmentId: editor.assignments[0].assignment.id, periodId: revision.id, expectedVersion: editor.assignments[0].assignment.version, expectedPeriodVersion: revision.version })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(editor.warnings[0].missingSkills).toContainEqual({ id: active.id, name: active.name, sources: ["Assignment"] });
    expect(await db.select().from(assignmentSkillRequirements).where(eq(assignmentSkillRequirements.scheduleAssignmentId, assignment.id))).toHaveLength(2);
  });

  it("offers the union of directly scoped Projects and linked scoped Locations", async () => {
    const manager = actor(phase4Ids.locationAdmin, "ADMIN");
    const [secondLocation, hiddenLocation] = await db.insert(locations).values([{ clientId: phase3Ids.alphaClient, name: "Second scoped site", address: "Fictional second site" }, { clientId: phase3Ids.alphaClient, name: "Hidden site", address: "Fictional hidden site" }]).returning();
    await db.insert(projectLocations).values([{ projectId: phase3Ids.alphaProjectTwo, locationId: secondLocation.id }, { projectId: phase3Ids.alphaProjectTwo, locationId: hiddenLocation.id }]);
    await db.insert(adminScopeGrants).values([{ userId: manager.id, scopeType: "PROJECT", scopeReference: phase3Ids.alphaProjectOne }, { userId: manager.id, scopeType: "LOCATION", scopeReference: secondLocation.id }]);
    const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2031-04" });
    const editor = await schedulingService.getPeriodEditor(manager, period.id);
    expect(editor.projects.map((row) => row.project.id).sort()).toEqual([phase3Ids.alphaProjectOne, phase3Ids.alphaProjectTwo].sort());
    const choices = new Map(editor.locationsByProject);
    expect(choices.get(phase3Ids.alphaProjectOne)?.map((row) => row.location.id)).toEqual([phase3Ids.alphaLocation]);
    expect(choices.get(phase3Ids.alphaProjectTwo)?.map((row) => row.location.id)).toEqual([secondLocation.id]);
  });
});

describe("Super Admin schedule mutation authority", () => {
  const writes = (manager: AuthenticatedActor, period: typeof schedulePeriods.$inferSelect, assignment: typeof scheduleAssignments.$inferSelect) => {
    const version = { periodId: period.id, expectedVersion: period.version + 1 };
    const work = { periodId: period.id, expectedPeriodVersion: period.version + 1, employeeUserId: assignment.employeeUserId, projectId: assignment.projectId, locationId: assignment.locationId, assignmentDate: assignment.assignmentDate, startTime: "09:00", endTime: "10:00" };
    return [
      () => schedulingService.createPeriod(manager, { clientId: period.clientId, month: "2034-12" }),
      () => schedulingService.addAssignment(manager, { ...work, assignmentDate: assignment.assignmentDate.slice(0, 8) + "15" }),
      () => schedulingService.updateAssignment(manager, { ...work, assignmentId: assignment.id, expectedVersion: assignment.version, sharedInstruction: "Unauthorized changed work instruction" }),
      () => schedulingService.removeAssignment(manager, { periodId: period.id, expectedPeriodVersion: period.version + 1, assignmentId: assignment.id, expectedVersion: assignment.version }),
      () => schedulingService.propose(manager, version),
      () => schedulingService.returnToDraft(manager, { ...version, reason: "Unauthorized return to Draft" }),
      () => schedulingService.publish(manager, version),
      () => schedulingService.createRevision(manager, version),
      () => db.transaction((tx) => schedulingService.applyReplacementEffect(tx, manager, { anchorAssignmentId: assignment.id, selectedEmployeeUserId: phase4Ids.alphaEmployee, intent: "ADD_COVERAGE_ASSIGNMENT" })),
    ];
  };

  it.each([
    [ava, phase3Ids.alphaClient, phase3Ids.alphaProjectOne, phase3Ids.alphaLocation, cora.id, "2033-01"],
    [ben, phase3Ids.bravoClient, phase3Ids.bravoProject, phase3Ids.bravoLocation, phase4Ids.bravoEmployee, "2033-02"],
    [actor(phase4Ids.locationAdmin, "ADMIN"), phase3Ids.gammaClient, phase3Ids.gammaProject, phase3Ids.gammaLocation, cora.id, "2033-03"],
  ] as const)("refuses all direct schedule mutations for scoped Admin %s", async (manager, clientId, projectId, locationId, employeeUserId, month) => {
    const period = await schedulingService.createPeriod(nora, { clientId, month });
    const assignment = await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId, projectId, locationId, assignmentDate: `${month}-12`, startTime: "09:00", endTime: "10:00", sharedInstruction: "Retain this approved planning instruction." });
    const auditBefore = await db.select().from(auditEvents);
    const notificationsBefore = await db.select().from(notifications);
    const periodsBefore = await db.select().from(schedulePeriods);
    for (const write of writes(manager, period, assignment)) await expect(write()).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(await db.select().from(schedulePeriods)).toEqual(periodsBefore);
    expect(await db.select().from(scheduleAssignments).where(eq(scheduleAssignments.id, assignment.id))).toEqual([assignment]);
    expect(await db.select().from(auditEvents)).toEqual(auditBefore);
    expect(await db.select().from(notifications)).toEqual(notificationsBefore);
    const draft = await schedulingService.getPeriodEditor(manager, period.id);
    expect(draft.period.status).toBe("DRAFT");
    expect(draft).toMatchObject({ canManage: false, canPropose: false, canPublish: false });
    const proposed = await schedulingService.propose(nora, { periodId: period.id, expectedVersion: period.version + 1 });
    expect((await schedulingService.getPeriodEditor(manager, period.id)).period.status).toBe("PROPOSED");
    await schedulingService.publish(nora, { periodId: period.id, expectedVersion: proposed.version });
    expect((await schedulingService.getPeriodEditor(manager, period.id)).period.status).toBe("PUBLISHED");
  });

  it("refuses a forged Super Admin actor and every mutation after a planner is demoted", async () => {
    const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2033-04" });
    const assignment = await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: cora.id, projectId: phase3Ids.alphaProjectOne, locationId: phase3Ids.alphaLocation, assignmentDate: "2033-04-12", startTime: "09:00", endTime: "10:00" });
    const former = actor("phase4-demoted-planner", "SUPER_ADMIN");
    await db.insert(users).values({ id: former.id, role: "SUPER_ADMIN", displayName: "Former schedule planner" });
    await db.update(users).set({ role: "ADMIN" }).where(eq(users.id, former.id));
    const periodBefore = await db.select().from(schedulePeriods);
    const auditBefore = await db.select().from(auditEvents);
    for (const supplied of [{ ...ava, role: "SUPER_ADMIN" as const }, former]) {
      for (const write of writes(supplied, period, assignment)) await expect(write()).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    }
    expect(await db.select().from(schedulePeriods)).toEqual(periodBefore);
    expect(await db.select().from(scheduleAssignments).where(eq(scheduleAssignments.id, assignment.id))).toEqual([assignment]);
    expect(await db.select().from(auditEvents)).toEqual(auditBefore);
  });

  it("refuses deactivated planners and revoked session versions before writing a Draft", async () => {
    const planner = actor("phase4-inactive-planner", "SUPER_ADMIN");
    await db.insert(users).values({ id: planner.id, role: "SUPER_ADMIN", displayName: "Inactive schedule planner", active: false });
    await expect(schedulingService.createPeriod(planner, { clientId: phase3Ids.alphaClient, month: "2034-11" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.update(users).set({ active: true, sessionVersion: 2 }).where(eq(users.id, planner.id));
    await expect(schedulingService.createPeriod(planner, { clientId: phase3Ids.alphaClient, month: "2034-11" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.select().from(schedulePeriods).where(and(eq(schedulePeriods.clientId, phase3Ids.alphaClient), eq(schedulePeriods.planningMonth, "2034-11-01")))).toHaveLength(0);
  });
});
