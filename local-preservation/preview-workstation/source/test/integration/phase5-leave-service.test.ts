import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projects } from "@/db/schema";
import { phase3Ids } from "../../scripts/phase4-test-fixtures.mjs";
import { LeaveService, leaveService } from "@/modules/leave/service";
import { schedulingService } from "@/modules/scheduling/service";
import type { AuthenticatedActor } from "@/shared/types/foundation";
const actor = (id: string, role: AuthenticatedActor["role"]): AuthenticatedActor => ({ id, role, displayName: id, sessionId: `s-${id}`, sessionVersion: 1, scopes: [], authenticationMode: "mock" });
const nora = actor("mock-super-admin-nora", "SUPER_ADMIN"), ava = actor("mock-admin-ava", "ADMIN"), cora = actor("mock-employee-cora", "EMPLOYEE");
describe("Phase 5 leave service", () => { it("enforces privacy, lifecycle, balance, and schedule leave integrity", async () => {
  const request = await leaveService.submit(cora, { startDate: "2026-09-14", endDate: "2026-09-20", privateReason: "Private medical note" });
  await expect(leaveService.submit(cora, { startDate: "2026-09-18", endDate: "2026-09-22" })).rejects.toMatchObject({ code: "ACTIVE_OVERLAP" });
  await expect(leaveService.decide(ava, { leaveRequestId: request.id, expectedVersion: request.version, decision: "APPROVED", response: "ok" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  const review = await leaveService.getReview(nora, request.id); expect(review.request.privateReason).toBe("Private medical note"); expect(review.balance.allowance).toBe(22); expect(review.requestedWorkingDays).toBe(5);
  const approved = await leaveService.decide(nora, { leaveRequestId: request.id, expectedVersion: request.version, decision: "APPROVED", response: "Approved" }); expect(approved.status).toBe("APPROVED");
  const adminView = await leaveService.approvedUnavailabilityForAdmin(ava); expect(adminView[0]).toMatchObject({ employeeUserId: cora.id, status: "APPROVED" }); expect(adminView[0]).not.toHaveProperty("privateReason");
  const [project] = await db.select().from(projects).where(eq(projects.id, phase3Ids.alphaProjectOne)); const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2026-09" });
  await expect(schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: cora.id, projectId: project!.id, locationId: phase3Ids.alphaLocation, assignmentDate: "2026-09-15", startTime: "09:00", endTime: "10:00" })).rejects.toMatchObject({ code: "CONFLICT" });
  const pending = await leaveService.submit(cora, { startDate: "2026-10-01", endDate: "2026-10-01" }); const cancelled = await leaveService.cancel(cora, { leaveRequestId: pending.id, expectedVersion: pending.version }); expect(cancelled.status).toBe("CANCELLED"); await expect(leaveService.cancel(cora, { leaveRequestId: pending.id, expectedVersion: pending.version })).rejects.toMatchObject({ code: "STALE_VERSION" });
  const failing = new LeaveService(async () => { throw new Error("forced audit failure"); }); await expect(failing.submit(cora, { startDate: "2026-10-05", endDate: "2026-10-05" })).rejects.toThrow("forced audit failure");
});

it("lists current Published impact and blocks approval without changing Published work", async () => {
  const [project] = await db.select().from(projects).where(eq(projects.id, phase3Ids.alphaProjectOne));
  const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2026-12" });
  await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: cora.id, projectId: project!.id, locationId: phase3Ids.alphaLocation, assignmentDate: "2026-12-15", startTime: "09:00", endTime: "10:00" });
  const proposed = await schedulingService.propose(nora, { periodId: period.id, expectedVersion: period.version + 1 });
  await schedulingService.publish(nora, { periodId: proposed.id, expectedVersion: proposed.version });
  const request = await leaveService.submit(cora, { startDate: "2026-12-15", endDate: "2026-12-15" });
  const review = await leaveService.getReview(nora, request.id);
  expect(review.publishedImpact).toHaveLength(1);
  expect(review.publishedImpact[0]).toMatchObject({ assignmentDate: "2026-12-15", projectName: project!.name });
  await expect(leaveService.decide(nora, { leaveRequestId: request.id, expectedVersion: request.version, decision: "APPROVED", response: "Approved" })).rejects.toMatchObject({ code: "PUBLISHED_ASSIGNMENT_CONFLICT" });
  expect(await schedulingService.getMySchedule(cora, { month: "2026-12" })).toHaveLength(1);
});

it("serializes concurrent approval for one employee without overspending balance", async () => {
  const first = await leaveService.submit(cora, { startDate: "2026-01-01", endDate: "2026-01-21" });
  const second = await leaveService.submit(cora, { startDate: "2026-02-01", endDate: "2026-02-19" });
  const results = await Promise.allSettled([
    leaveService.decide(nora, { leaveRequestId: first.id, expectedVersion: first.version, decision: "APPROVED", response: "Approved" }),
    leaveService.decide(nora, { leaveRequestId: second.id, expectedVersion: second.version, decision: "APPROVED", response: "Approved" }),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { code: "INSUFFICIENT_BALANCE" } });
  const allowance = await leaveService.getAllowance(nora);
  await expect(leaveService.updateAllowance(nora, { annualWorkingDays: 18, expectedVersion: allowance.version })).rejects.toMatchObject({ code: "UNSAFE_ALLOWANCE_REDUCTION" });
  await expect(leaveService.updateAllowance(ava, { annualWorkingDays: 23, expectedVersion: allowance.version })).rejects.toMatchObject({ code: "FORBIDDEN" });
});
});
