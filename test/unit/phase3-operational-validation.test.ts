import { describe, expect, it, vi } from "vitest";
import { contactSchema, createClientSchema, createLocationSchema, createProjectSchema, staffingRequirementSchema } from "@/modules/operations/validation";

const mocks = vi.hoisted(() => ({ getCurrentActor: vi.fn(), createClient: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/auth/session-service", () => ({ getCurrentActor: mocks.getCurrentActor }));
vi.mock("@/modules/operations/service", () => ({ operationalService: { createClient: mocks.createClient } }));

const clientId = "10000000-0000-4000-8000-000000000001";
describe("Phase 3 operational validation", () => {
  it("accepts ordered dates and rejects invalid or unknown Client/Project fields", () => {
    expect(createClientSchema.safeParse({ companyName: "Example Client", serviceStartDate: "2026-01-01", serviceEndDate: "2026-12-31" }).success).toBe(true);
    expect(createClientSchema.safeParse({ companyName: "Example Client", serviceStartDate: "2027-01-01", serviceEndDate: "2026-01-01" }).success).toBe(false);
    expect(createProjectSchema.safeParse({ clientId, name: "Example Project", startDate: "2027-01-01", endDate: "2026-01-01" }).success).toBe(false);
    expect(createClientSchema.safeParse({ companyName: "Example Client", scheduleId: "hidden" }).success).toBe(false);
  });
  it("requires a complete, range-valid optional coordinate pair", () => {
    const base = { clientId, name: "Example Site", address: "1 Example Road" };
    expect(createLocationSchema.safeParse(base).success).toBe(true); expect(createLocationSchema.safeParse({ ...base, latitude: 25, longitude: 55 }).success).toBe(true);
    expect(createLocationSchema.safeParse({ ...base, latitude: 25 }).success).toBe(false); expect(createLocationSchema.safeParse({ ...base, latitude: -91, longitude: 55 }).success).toBe(false); expect(createLocationSchema.safeParse({ ...base, latitude: 25, longitude: 181 }).success).toBe(false);
  });
  it("keeps contacts and positive staffing requirements attached to exactly one typed target", () => {
    expect(contactSchema.safeParse({ type: "CLIENT", id: clientId, name: "Operations Desk", workEmail: "ops@example.test" }).success).toBe(true);
    expect(contactSchema.safeParse({ type: "CLIENT", id: clientId, name: "Desk", homePhone: "private" }).success).toBe(false);
    expect(staffingRequirementSchema.safeParse({ type: "PROJECT", id: clientId, requiredSkillId: clientId, requiredEmployeeCount: 2 }).success).toBe(true);
    expect(staffingRequirementSchema.safeParse({ type: "PROJECT", id: clientId, requiredSkillId: clientId, requiredEmployeeCount: 0 }).success).toBe(false);
  });
  it("rejects crafted Server Action fields before authentication or persistence", async () => {
    const { createClientAction } = await import("@/modules/operations/actions");
    const data = new FormData(); data.set("companyName", "Crafted Client"); data.set("scheduleAssignment", "forged");
    await expect(createClientAction({}, data)).resolves.toEqual({ error: "The Client form contained unsupported fields." });
    expect(mocks.getCurrentActor).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
