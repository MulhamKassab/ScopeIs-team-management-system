import { describe, expect, it } from "vitest";
import { assignmentRequirementArchiveSchema, assignmentRequirementCreateSchema, plannerSkillSchema } from "@/modules/capabilities/validation";

const id = "10000000-0000-4000-8000-000000000001";
describe("Phase 6 capability validation", () => {
  it("requires IDs and positive versions without accepting extra crafted fields", () => {
    expect(assignmentRequirementCreateSchema.safeParse({ assignmentId: id, skillId: id }).success).toBe(true);
    expect(assignmentRequirementCreateSchema.safeParse({ assignmentId: id, skillId: id, source: "CLIENT" }).success).toBe(false);
    expect(assignmentRequirementArchiveSchema.safeParse({ requirementId: id, expectedVersion: 0 }).success).toBe(false);
    expect(plannerSkillSchema.safeParse({}).success).toBe(true);
    expect(plannerSkillSchema.safeParse({ skillId: "not-a-uuid" }).success).toBe(false);
  });
});
