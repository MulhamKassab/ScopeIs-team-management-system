import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projects } from "@/db/schema";
import { phase3Ids, phase4Ids } from "../../scripts/phase4-test-fixtures.mjs";
import { LeaveService, leaveService, dubaiCalendarYear, workingDays } from "@/modules/leave/service";
import { schedulingService } from "@/modules/scheduling/service";
import type { AuthenticatedActor } from "@/shared/types/foundation";
const actor = (id: string, role: AuthenticatedActor["role"]): AuthenticatedActor => ({ id, role, displayName: id, sessionId: `s-${id}`, sessionVersion: 1, scopes: [], authenticationMode: "mock" });
const nora = actor("mock-super-admin-nora", "SUPER_ADMIN"), ava = actor("mock-admin-ava", "ADMIN"), cora = actor("mock-employee-cora", "EMPLOYEE");
describe("Phase 5 leave service", () => { it("enforces privacy, lifecycle, balance, and schedule leave integrity", async () => {
  const request = await leaveService.submit(cora, { startDate: "2026-09-14", endDate: "2026-09-20", privateReason: "Private medical note" });
  await expect(leaveService.submit(cora, { startDate: "2026-09-18", endDate: "2026-09-22" })).rejects.toMatchObject({ code: "ACTIVE_OVERLAP" });
  await expect(leaveService.decide(ava, { leaveRequestId: request.id, expectedVersion: request.version, decision: "APPROVED", response: "ok" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  const review = await leaveService.getReview(nora, request.id); expect(review.employeeName).toBe("Cora Bell"); expect(review.request.privateReason).toBe("Private medical note"); await expect(leaveService.getReview(ava, request.id)).rejects.toMatchObject({ code: "NOT_FOUND" }); await expect(leaveService.getReview(nora, "invalid-id")).rejects.toMatchObject({ code: "NOT_FOUND" }); expect(review.balance.allowance).toBe(22); expect(review.requestedWorkingDays).toBe(5);
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

describe("Annual leave year allocation regressions", () => {
  it("uses the requested year's balance and does not spend that year's allowance twice", async () => {
    const employee = actor(phase4Ids.alphaEmployee, "EMPLOYEE");
    const year = dubaiCalendarYear() + 2;
    const first = await leaveService.submit(employee, { startDate: `${year}-01-01`, endDate: `${year}-01-28` });
    const second = await leaveService.submit(employee, { startDate: `${year}-02-01`, endDate: `${year}-02-07` });
    await leaveService.decide(nora, { leaveRequestId: first.id, expectedVersion: first.version, decision: "APPROVED" });
    const review = await leaveService.getReview(nora, second.id);
    expect(review.balance).toMatchObject({ year, used: 20, remaining: 2, requestedWorkingDays: 5, projectedRemaining: -3 });
    await expect(leaveService.decide(nora, { leaveRequestId: second.id, expectedVersion: second.version, decision: "APPROVED" })).rejects.toMatchObject({ code: "INSUFFICIENT_BALANCE" });
    const nextYear = await leaveService.submit(employee, { startDate: `${year + 1}-01-01`, endDate: `${year + 1}-01-07` });
    await expect(leaveService.decide(nora, { leaveRequestId: nextYear.id, expectedVersion: nextYear.version, decision: "APPROVED" })).resolves.toMatchObject({ status: "APPROVED" });
    const mine = await leaveService.getMyLeave(employee);
    expect(mine.requests.find((row) => row.id === first.id)?.balances).toEqual([expect.objectContaining({ year, remaining: 2, projectedRemaining: 2 })]);
  });

  it("does not reject future leave because the current year is exhausted", async () => {
    const employee = actor(phase4Ids.bravoEmployee, "EMPLOYEE");
    const year = dubaiCalendarYear();
    let endDate = `${year}-01-28`;
    while (workingDays(`${year}-01-01`, endDate) < 22) {
      const next = new Date(`${endDate}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1); endDate = next.toISOString().slice(0, 10);
    }
    const current = await leaveService.submit(employee, { startDate: `${year}-01-01`, endDate });
    await leaveService.decide(nora, { leaveRequestId: current.id, expectedVersion: current.version, decision: "APPROVED" });
    const future = await leaveService.submit(employee, { startDate: `${year + 1}-06-01`, endDate: `${year + 1}-06-07` });
    expect((await leaveService.getReview(nora, future.id)).balance).toMatchObject({ year: year + 1, used: 0, remaining: 22 });
    await expect(leaveService.decide(nora, { leaveRequestId: future.id, expectedVersion: future.version, decision: "APPROVED" })).resolves.toMatchObject({ status: "APPROVED" });
  });

  it("allocates cross-year leave separately and refuses overspending either year", async () => {
    const employee = actor(phase4Ids.alphaEmployee, "EMPLOYEE");
    const first = await leaveService.submit(employee, { startDate: "2040-01-02", endDate: "2040-01-29" });
    await leaveService.decide(nora, { leaveRequestId: first.id, expectedVersion: first.version, decision: "APPROVED" });
    const spanning = await leaveService.submit(employee, { startDate: "2040-12-31", endDate: "2041-01-25" });
    const review = await leaveService.getReview(nora, spanning.id);
    expect(review.requestedWorkingDays).toBeGreaterThan(22 - 20);
    expect(review.balances).toEqual([
      expect.objectContaining({ year: 2040, requestedWorkingDays: 1, remaining: 2, projectedRemaining: 1 }),
      expect.objectContaining({ year: 2041, requestedWorkingDays: 19, remaining: 22, projectedRemaining: 3 }),
    ]);
    await expect(leaveService.decide(nora, { leaveRequestId: spanning.id, expectedVersion: spanning.version, decision: "APPROVED" })).resolves.toMatchObject({ status: "APPROVED" });
    const overflow = await leaveService.submit(employee, { startDate: "2041-12-30", endDate: "2042-02-28" });
    await expect(leaveService.decide(nora, { leaveRequestId: overflow.id, expectedVersion: overflow.version, decision: "APPROVED" })).rejects.toMatchObject({ code: "INSUFFICIENT_BALANCE" });
    expect((await leaveService.getReview(nora, overflow.id)).request.status).toBe("PENDING");
  });
});
