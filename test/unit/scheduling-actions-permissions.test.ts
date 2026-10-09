import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedActor } from "@/shared/types/foundation";

const mocks = vi.hoisted(() => ({
  getCurrentActor: vi.fn(), revalidatePath: vi.fn(),
  service: { createPeriod: vi.fn(), addAssignment: vi.fn(), updateAssignment: vi.fn(), removeAssignment: vi.fn(), propose: vi.fn(), returnToDraft: vi.fn(), publish: vi.fn(), createRevision: vi.fn() },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/auth/session-service", () => ({ getCurrentActor: mocks.getCurrentActor }));
vi.mock("@/modules/scheduling/service", () => ({ schedulingService: mocks.service }));

import { addScheduleAssignmentAction, createSchedulePeriodAction, createScheduleRevisionAction, proposeScheduleAction, publishScheduleAction, removeScheduleAssignmentAction, returnScheduleToDraftAction, updateScheduleAssignmentAction } from "@/modules/scheduling/actions";

const admin: AuthenticatedActor = { id: "current-admin", role: "ADMIN", displayName: "Current Admin", sessionId: "session", sessionVersion: 1, authenticationMode: "mock", scopes: [{ type: "CLIENT", reference: "client" }, { type: "TEAM", reference: "team" }] };
const form = (values: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };
const version = { periodId: "period", expectedVersion: "2" };
const work = { periodId: "period", expectedPeriodVersion: "2", employeeUserId: "employee", projectId: "project", locationId: "location", assignmentDate: "2026-10-12", startTime: "09:00", endTime: "10:00", sharedInstruction: "Work instruction" };

beforeEach(() => { vi.clearAllMocks(); mocks.getCurrentActor.mockResolvedValue(admin); });

describe("schedule Server Action authority", () => {
  it.each([
    ["create Draft", createSchedulePeriodAction, { clientId: "client", month: "2026-10" }],
    ["add assignment", addScheduleAssignmentAction, work],
    ["edit assignment and instruction", updateScheduleAssignmentAction, { ...work, assignmentId: "assignment", expectedVersion: "1" }],
    ["remove assignment", removeScheduleAssignmentAction, { periodId: "period", expectedPeriodVersion: "2", assignmentId: "assignment", expectedVersion: "1" }],
    ["propose", proposeScheduleAction, version],
    ["return to Draft", returnScheduleToDraftAction, { ...version, reason: "Correct the plan" }],
    ["publish", publishScheduleAction, version],
    ["create revision", createScheduleRevisionAction, version],
  ] as const)("refuses Admin direct %s action without calling a mutating service", async (_name, action, values) => {
    expect(await action({}, form(values))).toEqual({ error: "Only Super Admin can change schedules." });
    for (const service of Object.values(mocks.service)) expect(service).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses an Employee direct Draft action", async () => {
    mocks.getCurrentActor.mockResolvedValue({ ...admin, role: "EMPLOYEE", scopes: [] });
    expect(await createSchedulePeriodAction({}, form({ clientId: "client", month: "2026-10" }))).toEqual({ error: "Only Super Admin can change schedules." });
    expect(mocks.service.createPeriod).not.toHaveBeenCalled();
  });

  it("uses current Super Admin identity when saving an authorized Draft", async () => {
    const superAdmin = { ...admin, role: "SUPER_ADMIN" as const };
    mocks.getCurrentActor.mockResolvedValue(superAdmin);
    mocks.service.createPeriod.mockResolvedValue({ id: "new-period" });
    expect(await createSchedulePeriodAction({}, form({ clientId: "client", month: "2026-10" }))).toEqual({ success: "Draft schedule created." });
    expect(mocks.service.createPeriod).toHaveBeenCalledWith(superAdmin, { clientId: "client", month: "2026-10" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/schedule");
  });

  it("refuses an expired session before schedule mutation", async () => {
    mocks.getCurrentActor.mockResolvedValue(null);
    expect(await createSchedulePeriodAction({}, form({ clientId: "client", month: "2026-10" }))).toEqual({ error: "Your session expired. Sign in again." });
    expect(mocks.service.createPeriod).not.toHaveBeenCalled();
  });
});
