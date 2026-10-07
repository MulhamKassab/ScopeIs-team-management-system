import { describe, expect, it } from "vitest";
import { assignmentCreateSchema, createPeriodSchema, returnPeriodSchema } from "@/modules/scheduling/validation";

const id = "10000000-0000-4000-8000-000000000001";
describe("Phase 4 scheduling validation", () => {
  it("accepts only a Client-month and same-day timed assignment contract", () => {
    expect(createPeriodSchema.safeParse({ clientId: id, month: "2026-05" }).success).toBe(true);
    expect(createPeriodSchema.safeParse({ clientId: id, month: "2026-5" }).success).toBe(false);
    expect(assignmentCreateSchema.safeParse({ periodId: id, expectedPeriodVersion: 1, employeeUserId: "employee", projectId: id, locationId: id, assignmentDate: "2026-05-04", startTime: "09:00", endTime: "10:00", sharedInstruction: "Bring badge" }).success).toBe(true);
    expect(assignmentCreateSchema.safeParse({ periodId: id, expectedPeriodVersion: 1, employeeUserId: "employee", projectId: id, locationId: id, assignmentDate: "2026-05-04", startTime: "10:00", endTime: "09:00" }).success).toBe(false);
    expect(assignmentCreateSchema.safeParse({ periodId: id, expectedPeriodVersion: 1, employeeUserId: "employee", projectId: id, locationId: id, assignmentDate: "2026-05-04", startTime: "09:00", endTime: "10:00", recurring: true }).success).toBe(false);
  });
  it("requires a reason when returning a proposal and rejects unsupported fields", () => {
    expect(returnPeriodSchema.safeParse({ periodId: id, expectedVersion: 2, reason: "Please correct the staffing date." }).success).toBe(true);
    expect(returnPeriodSchema.safeParse({ periodId: id, expectedVersion: 2, reason: "" }).success).toBe(false);
    expect(createPeriodSchema.safeParse({ clientId: id, month: "2026-05", status: "PUBLISHED" }).success).toBe(false);
  });
});
