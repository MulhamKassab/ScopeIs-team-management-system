import { describe, expect, it } from "vitest";
import { planningMapService } from "@/modules/maps/service";
import { phase3Ids } from "../../scripts/phase4-test-fixtures.mjs";
import type { AuthenticatedActor } from "@/shared/types/foundation";

const nora: AuthenticatedActor = { id: "mock-super-admin-nora", displayName: "Nora", role: "SUPER_ADMIN", sessionId: "n", sessionVersion: 1, authenticationMode: "mock", scopes: [] };
const ava: AuthenticatedActor = { id: "mock-admin-ava", displayName: "Ava", role: "ADMIN", sessionId: "a", sessionVersion: 1, authenticationMode: "mock", scopes: [{ type: "TEAM", reference: "team:alpha" }, { type: "CLIENT", reference: phase3Ids.alphaClient }] };
const cora: AuthenticatedActor = { id: "mock-employee-cora", displayName: "Cora", role: "EMPLOYEE", sessionId: "c", sessionVersion: 1, authenticationMode: "mock", scopes: [] };

describe("Phase 8 PostgreSQL planning projection", () => {
  it("projects current Published facts with strict scope, privacy, and filter controls", async () => {
    const superProjection = await planningMapService.projection(nora, { date: "2027-05-12" });
    expect(superProjection.assignments).toHaveLength(2); expect(superProjection.assignments.find((item) => item.employeeId === cora.id)?.employeeCoordinate).toEqual({ latitude: 25.2048, longitude: 55.2708 }); expect(superProjection.assignments.find((item) => item.employeeId === cora.id)).toMatchObject({ unavailable: true }); expect(JSON.stringify(superProjection)).not.toContain("private fictional reason"); expect(JSON.stringify(superProjection)).not.toContain("candidate");
    const adminProjection = await planningMapService.projection(ava, { date: "2027-05-12" });
    expect(adminProjection.assignments).toHaveLength(1); expect(adminProjection.assignments[0]).toMatchObject({ employeeId: cora.id, employeePrecision: "coarse", employeeCoordinate: { latitude: 25.2125, longitude: 55.2625 } }); expect(JSON.stringify(adminProjection)).not.toContain("25.2048"); expect(JSON.stringify(adminProjection)).not.toContain("private fictional reason"); expect(JSON.stringify(adminProjection)).not.toContain("candidate");
    const teamOnly: AuthenticatedActor = { ...ava, scopes: [{ type: "TEAM", reference: "team:alpha" }] }; const operationalOnly: AuthenticatedActor = { ...ava, scopes: [{ type: "CLIENT", reference: phase3Ids.alphaClient }] };
    expect((await planningMapService.projection(teamOnly, { date: "2027-05-12" })).assignments).toEqual([]); expect((await planningMapService.projection(operationalOnly, { date: "2027-05-12" })).assignments).toEqual([]);
    expect((await planningMapService.projection(ava, { date: "2027-05-12", employeeId: "00000000-0000-4000-8000-000000000999" })).invalidFilter).toBe(true);
    expect((await planningMapService.projection(ava, { date: "not-a-date" })).invalidFilter).toBe(true);
    await expect(planningMapService.projection(cora, { date: "2027-05-12" })).rejects.toThrow("FORBIDDEN");
  });
});
