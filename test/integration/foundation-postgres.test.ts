import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { adminScopeGrants, auditEvents, notifications, sessions } from "@/db/schema";
import { mockPersonas } from "@/db/seed/fixtures";
import { beginMockSession } from "@/modules/auth/session-service";
import { foundationRepository } from "@/server/repositories/foundation-repository";
import { createScopeGrantWithGovernance } from "@/server/transactions/foundation-transaction";

describe("PostgreSQL Phase 1 foundation", () => {
  it("contains the idempotently seeded fictional personas and scope grants", async () => {
    const user = await foundationRepository.findActiveUser("mock-admin-ava");
    expect(user?.role).toBe("ADMIN");
    expect(await foundationRepository.activeScopeGrants("mock-admin-ava")).toContainEqual({ type: "TEAM", reference: "team:alpha" });
    expect(mockPersonas).toHaveLength(5);
  });
  it("creates an opaque session and an audit event atomically", async () => {
    const started = await beginMockSession("mock-employee-cora");
    expect(started.token).toHaveLength(43);
    const stored = await foundationRepository.findActiveSession((await import("node:crypto")).createHash("sha256").update(started.token).digest("hex"));
    expect(stored?.session.id).toBe(started.actor.sessionId);
    const events = await db.select().from(auditEvents).where(eq(auditEvents.targetId, started.actor.sessionId));
    expect(events.some((event) => event.action === "auth.mock_session.started")).toBe(true);
  });
  it("rolls back both session and audit state when their transaction fails", async () => {
    const marker = randomUUID();
    let sessionId: string | undefined;
    await expect(db.transaction(async (tx) => {
      const [created] = await tx.insert(sessions).values({
        userId: "mock-employee-dan",
        tokenHash: marker.replaceAll("-", "").padEnd(64, "0"),
        sessionVersion: 1,
        expiresAt: new Date(Date.now() + 60_000),
      }).returning({ id: sessions.id });
      sessionId = created?.id;
      await tx.insert(auditEvents).values({
        actorUserId: "mock-employee-dan",
        actorRole: "EMPLOYEE",
        authenticationMode: "mock",
        action: "auth.mock_session.started",
        targetType: "session",
        targetId: sessionId,
        metadata: {},
      });
      throw new Error("forced certification rollback");
    })).rejects.toThrow("forced certification rollback");
    expect(sessionId).toBeDefined();
    expect((await db.select().from(sessions).where(eq(sessions.id, sessionId!))).length).toBe(0);
    expect((await db.select().from(auditEvents).where(eq(auditEvents.targetId, sessionId!))).length).toBe(0);
  });
  it("writes primary state, audit, and notification in one transaction and rolls back failures", async () => {
    const actor = { id: "mock-super-admin-nora", role: "SUPER_ADMIN" as const, displayName: "Nora", sessionId: "test", sessionVersion: 1, scopes: [], authenticationMode: "mock" as const };
    const suffix = randomUUID(); const scopeReference = `team:transaction-${suffix}`;
    await db.transaction((tx) => createScopeGrantWithGovernance(tx, actor, { userId: "mock-admin-ava", scopeType: "TEAM", scopeReference, notifyUserId: "mock-admin-ava" }));
    expect((await db.select().from(adminScopeGrants).where(eq(adminScopeGrants.scopeReference, scopeReference))).length).toBe(1);
    expect((await db.select().from(notifications).where(eq(notifications.relatedRecordId, scopeReference))).length).toBe(1);
    const rollbackReference = `team:rollback-${suffix}`;
    await expect(db.transaction((tx) => createScopeGrantWithGovernance(tx, actor, { userId: "mock-admin-ava", scopeType: "TEAM", scopeReference: rollbackReference, notifyUserId: "mock-admin-ava", failAfterAudit: true }))).rejects.toThrow();
    expect((await db.select().from(adminScopeGrants).where(eq(adminScopeGrants.scopeReference, rollbackReference))).length).toBe(0);
  });
  it("rejects a stale optimistic-concurrency update", async () => {
    const [grant] = await db.insert(adminScopeGrants).values({ userId: "mock-admin-ben", scopeType: "TEAM", scopeReference: `team:version-${randomUUID()}` }).returning();
    expect(grant).toBeDefined();
    const first = await foundationRepository.updateScopeGrantWithVersion(grant!.id, 1); expect(first?.version).toBe(2);
    expect(await foundationRepository.updateScopeGrantWithVersion(grant!.id, 1)).toBeNull();
  });
});
