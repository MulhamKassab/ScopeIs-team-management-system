import { describe, expect, it } from "vitest";
import { replacementCreateSchema, replacementDecisionSchema } from "@/modules/coverage/validation";
const id = "10000000-0000-4000-8000-000000000001";
describe("Phase 7 coverage validation", () => { it("accepts only the two explicit request intents and versioned decisions", () => { expect(replacementCreateSchema.safeParse({ anchorAssignmentId: id, intent: "REPLACE_ASSIGNMENT" }).success).toBe(true); expect(replacementCreateSchema.safeParse({ anchorAssignmentId: id, intent: "ADD_COVERAGE_ASSIGNMENT", staffingRequirementId: id, extra: true }).success).toBe(false); expect(replacementDecisionSchema.safeParse({ replacementRequestId: id, expectedVersion: 1, decision: "APPROVED", selectedEmployeeUserId: "employee" }).success).toBe(true); expect(replacementDecisionSchema.safeParse({ replacementRequestId: id, expectedVersion: 0, decision: "APPROVED" }).success).toBe(false); }); });

import { coverRequestLabel } from "@/modules/coverage/presentation";
describe("Cover publication status", () => {
  it("distinguishes pending publication from a published effect, including a superseded publication", () => {
    const request = { status: "APPROVED", decidedByUserId: "manager" };
    expect(coverRequestLabel({ ...request, effectPeriodStatus: "DRAFT" })).toBe("Draft prepared");
    expect(coverRequestLabel({ ...request, effectPeriodStatus: "PROPOSED" })).toBe("Draft prepared");
    expect(coverRequestLabel({ ...request, effectPeriodStatus: "PUBLISHED" })).toBe("Schedule published");
    expect(coverRequestLabel({ ...request, effectPeriodStatus: null })).toBe("Approved");
    expect(coverRequestLabel({ status: "REJECTED", decidedByUserId: null })).toBe("Cancelled");
  });
});
