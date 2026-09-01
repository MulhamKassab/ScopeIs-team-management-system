import { describe, expect, it } from "vitest";
import { createEmployeeSchema } from "@/modules/employees/employee-validation";

describe("Phase 2.4 employee creation validation", () => {
  it("allows only bounded workforce-record fields and normalizes safe text", () => {
    expect(createEmployeeSchema.parse({
      displayName: "  Riley   Workforce ", employeeCode: " EMP-240 ", workEmail: " ", workPhone: " ", professionalSummary: " ",
    })).toEqual({ displayName: "Riley Workforce", employeeCode: "EMP-240", workEmail: undefined, workPhone: undefined, professionalSummary: undefined });
  });

  it("rejects invalid identifiers, oversized contact fields, and any assignment or authorization fields", () => {
    expect(createEmployeeSchema.safeParse({ displayName: "R", employeeCode: "*bad" }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ displayName: "Riley Workforce", employeeCode: "EMP-240", workPhone: "1".repeat(41) }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ displayName: "Riley Workforce", employeeCode: "EMP-240", role: "ADMIN" }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ displayName: "Riley Workforce", employeeCode: "EMP-240", team: "team:alpha" }).success).toBe(false);
  });
});
