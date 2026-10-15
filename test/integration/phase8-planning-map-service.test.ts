import { describe, expect, it } from "vitest";
import { planningMapService } from "@/modules/maps/service";
import { planningLocationService } from "@/modules/maps/location-service";
import { employeeProfileService } from "@/modules/employees/employee-services";
import { db } from "@/db/client";
import { auditEvents, employeeProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { phase3Ids } from "../../scripts/phase4-test-fixtures.mjs";
import type { AuthenticatedActor } from "@/shared/types/foundation";

const nora: AuthenticatedActor = { id: "mock-super-admin-nora", displayName: "Nora", role: "SUPER_ADMIN", sessionId: "n", sessionVersion: 1, authenticationMode: "mock", scopes: [] };
const ava: AuthenticatedActor = { id: "mock-admin-ava", displayName: "Ava", role: "ADMIN", sessionId: "a", sessionVersion: 1, authenticationMode: "mock", scopes: [{ type: "TEAM", reference: "team:alpha" }, { type: "CLIENT", reference: phase3Ids.alphaClient }] };
const cora: AuthenticatedActor = { id: "mock-employee-cora", displayName: "Cora", role: "EMPLOYEE", sessionId: "c", sessionVersion: 1, authenticationMode: "mock", scopes: [] };

describe("Phase 8 PostgreSQL planning projection", () => {
  it("allows only current Super Admin coordinate maintenance and prevents stale delete/recreate writes", async () => {
    const created = await employeeProfileService.createEmployee(nora, { displayName: "Coordinate maintenance fixture" });
    const userId = created.user.id;
    expect(await planningLocationService.read(nora, userId)).toBeNull();
    const initial = { operation: "save", userId, expectedProfileVersion: created.profile.version, expectedVersion: 0, latitude: 25.12345, longitude: 55.67891 };
    for (const actor of [ava, cora, { ...ava, role: "SUPER_ADMIN" as const }]) {
      await expect(planningLocationService.read(actor, userId)).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(planningLocationService.change(actor, initial)).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    await expect(planningLocationService.change(nora, { ...initial, latitude: 91 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const first = await planningLocationService.change(nora, initial);
    expect(await planningLocationService.read(nora, userId)).toMatchObject({ latitude: initial.latitude, longitude: initial.longitude, version: 1 });
    const concurrent = await Promise.allSettled([planningLocationService.change(nora, { ...initial, expectedProfileVersion: first.version, expectedVersion: 1, latitude: 25.2 }), planningLocationService.change(nora, { ...initial, expectedProfileVersion: first.version, expectedVersion: 1, latitude: 25.3 })]);
    expect(concurrent.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(concurrent.filter((result) => result.status === "rejected")).toHaveLength(1);
    const [profile] = await db.select().from(employeeProfiles).where(eq(employeeProfiles.userId, userId));
    const location = await planningLocationService.read(nora, userId);
    const cleared = await planningLocationService.change(nora, { operation: "clear", userId, expectedProfileVersion: profile.version, expectedVersion: location!.version });
    expect(await planningLocationService.read(nora, userId)).toBeNull();
    await planningLocationService.change(nora, { ...initial, expectedProfileVersion: cleared.version });
    await expect(planningLocationService.change(nora, { ...initial, expectedProfileVersion: first.version, expectedVersion: 1 })).rejects.toMatchObject({ code: "STALE_VERSION" });
    const audits = await db.select().from(auditEvents).where(eq(auditEvents.targetId, userId));
    expect(JSON.stringify(audits.map((row) => row.metadata))).not.toContain(String(initial.longitude));
    await expect(planningLocationService.change({ ...nora, sessionVersion: 0 }, initial)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("projects current Published facts with strict scope, privacy, and filter controls", async () => {
    const superProjection = await planningMapService.projection(nora, { date: "2027-05-12" });
    expect(superProjection.assignments).toHaveLength(2); expect(superProjection.assignments.find((item) => item.employeeId === cora.id)?.employeeCoordinate).toEqual({ latitude: 25.2048, longitude: 55.2708 }); expect(superProjection.assignments.find((item) => item.employeeId === cora.id)).toMatchObject({ unavailable: true }); expect(JSON.stringify(superProjection)).not.toContain("private fictional reason"); expect(JSON.stringify(superProjection)).not.toContain("candidate");
    const adminProjection = await planningMapService.projection(ava, { date: "2027-05-12" });
    expect(adminProjection.assignments.every(item=>item.unavailable === false)).toBe(true);
    expect(adminProjection.assignments).toHaveLength(1); expect(adminProjection.assignments[0]).toMatchObject({ employeeId: cora.id, employeePrecision: "coarse", employeeCoordinate: { latitude: 25.2125, longitude: 55.2625 } }); expect(JSON.stringify(adminProjection)).not.toContain("25.2048"); expect(JSON.stringify(adminProjection)).not.toContain("private fictional reason"); expect(JSON.stringify(adminProjection)).not.toContain("candidate");
    const teamOnly: AuthenticatedActor = { ...ava, scopes: [{ type: "TEAM", reference: "team:alpha" }] }; const operationalOnly: AuthenticatedActor = { ...ava, scopes: [{ type: "CLIENT", reference: phase3Ids.alphaClient }] };
    expect((await planningMapService.projection(teamOnly, { date: "2027-05-12" })).assignments).toEqual([]); expect((await planningMapService.projection(operationalOnly, { date: "2027-05-12" })).assignments).toEqual([]);
    expect((await planningMapService.projection(ava, { date: "2027-05-12", employeeId: "00000000-0000-4000-8000-000000000999" })).invalidFilter).toBe(true);
    expect((await planningMapService.projection(ava, { date: "not-a-date" })).invalidFilter).toBe(true);
    await expect(planningMapService.projection(cora, { date: "2027-05-12" })).rejects.toThrow("FORBIDDEN");
  });
});
