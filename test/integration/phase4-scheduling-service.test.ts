import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { adminScopeGrants, auditEvents, clients, employeeProfiles, notifications, projects, schedulePeriods, users } from "@/db/schema";
import { phase3Ids, phase4Ids } from "../../scripts/phase4-test-fixtures.mjs";
import { SchedulingService, schedulingService } from "@/modules/scheduling/service";
import type { AuthenticatedActor } from "@/shared/types/foundation";

const actor = (id: string, role: AuthenticatedActor["role"]): AuthenticatedActor => ({ id, role, displayName: id, sessionId: `session-${id}`, sessionVersion: 1, scopes: [], authenticationMode: "mock" });
const nora = actor("mock-super-admin-nora", "SUPER_ADMIN"); const ava = actor("mock-admin-ava", "ADMIN"); const ben = actor("mock-admin-ben", "ADMIN"); const unscoped = actor("mock-employee-dan", "ADMIN"); const cora = actor("mock-employee-cora", "EMPLOYEE");
let alphaProject: { id: string; clientId: string };

beforeAll(async () => { const [project] = await db.select({ id: projects.id, clientId: projects.clientId }).from(projects).where(eq(projects.id, phase3Ids.alphaProjectOne)); alphaProject = project!; });

describe("Phase 4 scheduling service", () => {
  it("completes Draft → Proposed → Published and exposes only the employee projection", async () => {
    const period = await schedulingService.createPeriod(ava, { clientId: phase3Ids.alphaClient, month: "2026-05" });
    const assignment = await schedulingService.addAssignment(ava, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: "mock-employee-cora", projectId: alphaProject.id, locationId: phase3Ids.alphaLocation, assignmentDate: "2026-05-06", startTime: "09:00", endTime: "10:00", sharedInstruction: "Use the reception desk." });
    const proposed = await schedulingService.propose(ava, { periodId: period.id, expectedVersion: period.version + 1 });
    await expect(schedulingService.publish(ava, { periodId: period.id, expectedVersion: proposed.version })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const published = await schedulingService.publish(nora, { periodId: period.id, expectedVersion: proposed.version });
    expect(published.status).toBe("PUBLISHED"); expect(assignment.employeeUserId).toBe("mock-employee-cora");
    const mine = await schedulingService.getMySchedule(cora, { month: "2026-05" });
    expect(mine).toHaveLength(1); expect(mine[0]).toMatchObject({ clientName: "Alpha Facilities", projectName: "Alpha Modernization", locationName: "Alpha Shared Site" }); expect(mine[0]).not.toHaveProperty("address");
    expect(await db.select().from(notifications).where(and(eq(notifications.recipientUserId, cora.id), eq(notifications.eventType, "schedule.published")))).toHaveLength(1);
  });

  it("keeps operational scope and TEAM employee visibility separate", async () => {
    const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.bravoClient, month: "2026-06" });
    const assignment = await schedulingService.addAssignment(ben, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: phase4Ids.bravoEmployee, projectId: phase3Ids.bravoProject, locationId: phase3Ids.bravoLocation, assignmentDate: "2026-06-10", startTime: "11:00", endTime: "12:00" });
    expect(assignment.projectId).toBe(phase3Ids.bravoProject);
    await expect(schedulingService.createPeriod(ben, { clientId: phase3Ids.bravoClient, month: "2026-07" })).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await expect(schedulingService.propose(ben, { periodId: period.id, expectedVersion: period.version + 1 })).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await expect(schedulingService.addAssignment(ben, { periodId: period.id, expectedPeriodVersion: period.version + 1, employeeUserId: phase4Ids.bravoEmployee, projectId: alphaProject.id, locationId: phase3Ids.alphaLocation, assignmentDate: "2026-06-11", startTime: "11:00", endTime: "12:00" })).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await expect(schedulingService.createPeriod(unscoped, { clientId: phase3Ids.alphaClient, month: "2026-08" })).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
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
