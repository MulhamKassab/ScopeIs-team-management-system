import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { adminScopeGrants, auditEvents, sessions, userCredentials, users } from "@/db/schema";
import { approvedCredentialAccounts, bootstrapExistingUserCredentials } from "@/modules/auth/credential-bootstrap";
import { beginPasswordSession } from "@/modules/auth/credential-service";
import { sessionTokenHash } from "@/modules/auth/session-record";
import { foundationRepository } from "@/server/repositories/foundation-repository";
import { errors } from "@/shared/errors/app-error";

// The sanctioned temporary fictional credential is supplied exactly as an operator would supply it.
// It is never written to source, logs, audit metadata or any non-password column.
const approvedPassword = "user1234";
const ids = approvedCredentialAccounts.map((account) => account.userId);
const nora = "mock-super-admin-nora";
const ava = "mock-admin-ava";
const ben = "mock-admin-ben";
const cora = "mock-employee-cora";
const dan = "mock-employee-dan";

const countSessions = async (userId: string) =>
  Number((await db.select({ count: sql<number>`count(*)::int` }).from(sessions).where(eq(sessions.userId, userId)))[0].count);

/** Mirrors the session-validity gate in `getCurrentActor` without needing a request cookie store. */
async function resolveSession(token: string) {
  const found = await foundationRepository.findActiveSession(sessionTokenHash(token));
  if (!found || found.session.sessionVersion !== found.user.sessionVersion) return null;
  return { actor: { id: found.user.id, role: found.user.role }, session: found.session };
}

describe("credential authentication service", () => {
  describe("bootstrap", () => {
    it("performs no write when an approved identity no longer matches its expected role", async () => {
      await db.update(users).set({ role: "EMPLOYEE" }).where(eq(users.id, ava));
      try {
        await expect(bootstrapExistingUserCredentials(approvedPassword)).rejects.toThrow(/roles do not match/i);
        expect((await db.select().from(userCredentials)).length).toBe(0);
      } finally {
        await db.update(users).set({ role: "ADMIN" }).where(eq(users.id, ava));
      }
    });

    it("initializes exactly five credentials once and is idempotent on re-run", async () => {
      const first = await bootstrapExistingUserCredentials(approvedPassword);
      expect(first.count).toBe(5);
      expect(first.outcome).toBe("initialized");
      expect(first.userIds).toEqual(ids);
      const second = await bootstrapExistingUserCredentials(approvedPassword);
      expect(second.outcome).toBe("unchanged");
      expect(second.count).toBe(5);
      expect((await db.select().from(userCredentials)).length).toBe(5);
    });

    it("stores a unique non-plaintext hash and salt for every user", async () => {
      const rows = await db.select().from(userCredentials);
      const hashes = rows.map((row) => row.passwordHash);
      const salts = rows.map((row) => row.passwordHash.split("$")[5]);
      expect(new Set(hashes).size).toBe(5);
      expect(new Set(salts).size).toBe(5);
      for (const hash of hashes) {
        expect(hash).toMatch(/^scrypt\$v1\$32768\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
        expect(hash).not.toContain(approvedPassword);
      }
    });

    it("records only a sanitized count and outcome for the bootstrap audit event", async () => {
      const [event] = await db.select().from(auditEvents).where(eq(auditEvents.action, "auth.credentials.bootstrapped"));
      expect(event?.metadata).toEqual({ count: 5, outcome: "initialized" });
      expect(JSON.stringify(event?.metadata)).not.toContain(approvedPassword);
    });
  });

  describe("credential login", () => {
    it("accepts every approved account by username and by email", async () => {
      for (const account of approvedCredentialAccounts) {
        const byUsername = await beginPasswordSession({ identifier: account.username, password: approvedPassword });
        expect(byUsername.actor.id).toBe(account.userId);
        expect(byUsername.actor.authenticationMode).toBe("password");
        expect(byUsername.token).toHaveLength(43);
        const byEmail = await beginPasswordSession({ identifier: account.email.toUpperCase(), password: approvedPassword });
        expect(byEmail.actor.id).toBe(account.userId);
      }
    });

    it("matches case-insensitively on identifiers and case-sensitively on passwords", async () => {
      await expect(beginPasswordSession({ identifier: "NORA", password: approvedPassword })).resolves.toBeTruthy();
      await expect(beginPasswordSession({ identifier: nora, password: "User1234" })).rejects.toThrow(errors.invalidCredentials().message);
    });

    it("creates no session on a wrong password", async () => {
      const before = await countSessions(nora);
      await expect(beginPasswordSession({ identifier: "nora", password: "definitely-wrong" })).rejects.toThrow(errors.invalidCredentials().message);
      expect(await countSessions(nora)).toBe(before);
    });

    it("returns an identical public refusal for an unknown identifier and a wrong password", async () => {
      const capture = async (input: unknown) => {
        try { await beginPasswordSession(input); return null; } catch (error) {
          return error instanceof Error
            ? { message: error.message, code: (error as { code?: string }).code, status: (error as { status?: number }).status }
            : { message: "other" };
        }
      };
      const unknown = await capture({ identifier: "no-such-account", password: approvedPassword });
      const wrong = await capture({ identifier: "nora", password: "definitely-wrong" });
      expect(unknown).toEqual(wrong);
      expect(unknown?.message).toBe(errors.invalidCredentials().message);
    });

    it("refuses an inactive user with the same public response", async () => {
      await db.update(users).set({ active: false }).where(eq(users.id, cora));
      try {
        await expect(beginPasswordSession({ identifier: "cora", password: approvedPassword })).rejects.toThrow(errors.invalidCredentials().message);
        const refusals = await db.select().from(auditEvents).where(eq(auditEvents.action, "auth.password_session.refused"));
        expect(refusals.length).toBeGreaterThan(0);
      } finally {
        await db.update(users).set({ active: true }).where(eq(users.id, cora));
      }
    });

    it("rejects unknown fields and out-of-bounds input", async () => {
      await expect(beginPasswordSession({ identifier: "nora", password: approvedPassword, role: "SUPER_ADMIN" })).rejects.toThrow();
      await expect(beginPasswordSession({ identifier: "   ", password: approvedPassword })).rejects.toThrow();
      await expect(beginPasswordSession({ identifier: "nora", password: "x".repeat(200) })).rejects.toThrow();
    });
  });

  describe("brute-force protection", () => {
    it("locks after five failures within the window and refuses further attempts", async () => {
      const base = new Date("2027-01-01T00:00:00Z");
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await expect(beginPasswordSession({ identifier: "ava", password: `wrong-${attempt}` }, () => base)).rejects.toThrow(errors.invalidCredentials().message);
      }
      const [row] = await db.select().from(userCredentials).where(eq(userCredentials.userId, ava));
      expect(row?.failedAttemptCount).toBe(5);
      expect(row?.lockedUntil?.getTime()).toBe(base.getTime() + 900_000);
      await expect(beginPasswordSession({ identifier: "ava", password: approvedPassword }, () => base)).rejects.toThrow(errors.invalidCredentials().message);
    });

    it("expires the lock after fifteen minutes using a controlled clock", async () => {
      const base = new Date("2027-01-01T00:00:00Z");
      const afterLock = new Date(base.getTime() + 16 * 60_000);
      const session = await beginPasswordSession({ identifier: "ava", password: approvedPassword }, () => afterLock);
      expect(session.actor.id).toBe(ava);
      const [row] = await db.select().from(userCredentials).where(eq(userCredentials.userId, ava));
      expect(row?.failedAttemptCount).toBe(0);
      expect(row?.lockedUntil).toBeNull();
    });

    it("serializes concurrent failures so the threshold cannot be bypassed", async () => {
      const base = new Date("2027-02-01T00:00:00Z");
      const attempts = await Promise.allSettled(
        Array.from({ length: 8 }, (_value, index) => beginPasswordSession({ identifier: "ben", password: `concurrent-${index}` }, () => base)),
      );
      expect(attempts.every((attempt) => attempt.status === "rejected")).toBe(true);
      const [row] = await db.select().from(userCredentials).where(eq(userCredentials.userId, ben));
      expect(row?.failedAttemptCount).toBe(5);
      expect(row?.lockedUntil).not.toBeNull();
      await expect(beginPasswordSession({ identifier: "ben", password: approvedPassword }, () => base)).rejects.toThrow(errors.invalidCredentials().message);
    });

    it("resets the failure counters after a successful login", async () => {
      const base = new Date("2027-03-01T00:00:00Z");
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await expect(beginPasswordSession({ identifier: "dan", password: "wrong" }, () => base)).rejects.toThrow();
      }
      expect((await db.select().from(userCredentials).where(eq(userCredentials.userId, dan)))[0]?.failedAttemptCount).toBe(3);
      await beginPasswordSession({ identifier: "dan", password: approvedPassword }, () => base);
      const [row] = await db.select().from(userCredentials).where(eq(userCredentials.userId, dan));
      expect(row?.failedAttemptCount).toBe(0);
      expect(row?.failureWindowStartedAt).toBeNull();
    });
  });

  describe("sessions and authorization", () => {
    it("stores only the token hash and records a password session start", async () => {
      const session = await beginPasswordSession({ identifier: "nora", password: approvedPassword });
      const [stored] = await db.select().from(sessions).where(eq(sessions.id, session.actor.sessionId));
      expect(stored?.tokenHash).toBe(createHash("sha256").update(session.token).digest("hex"));
      expect(stored?.tokenHash).not.toBe(session.token);
      expect(stored?.authenticationMode).toBe("password");
      const started = await db.select().from(auditEvents).where(eq(auditEvents.targetId, session.actor.sessionId));
      expect(started.some((event) => event.action === "auth.password_session.started")).toBe(true);
    });

    it("preserves the existing role and scope matrix for all five accounts", async () => {
      for (const account of approvedCredentialAccounts) {
        const user = await foundationRepository.findActiveUser(account.userId);
        expect(user?.role).toBe(account.role);
      }
      expect(await foundationRepository.activeScopeGrants(ava)).toEqual([{ type: "TEAM", reference: "team:alpha" }]);
      expect(await foundationRepository.activeScopeGrants(ben)).toEqual([{ type: "TEAM", reference: "team:bravo" }]);
      expect(await foundationRepository.activeScopeGrants(cora)).toEqual([]);
      expect(await foundationRepository.activeScopeGrants(dan)).toEqual([]);
    });

    it("invalidates a session on revocation, session-version change and deactivation", async () => {
      const session = await beginPasswordSession({ identifier: "dan", password: approvedPassword });
      expect(await resolveSession(session.token)).not.toBeNull();

      await db.update(users).set({ sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, dan));
      expect(await resolveSession(session.token)).toBeNull();
      await db.update(users).set({ sessionVersion: 1 }).where(eq(users.id, dan));

      await db.update(users).set({ active: false }).where(eq(users.id, dan));
      expect(await resolveSession(session.token)).toBeNull();
      await db.update(users).set({ active: true }).where(eq(users.id, dan));

      await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.actor.sessionId));
      expect(await resolveSession(session.token)).toBeNull();
    });

    it("re-reads current role and active state on the next resolution", async () => {
      const session = await beginPasswordSession({ identifier: "cora", password: approvedPassword });
      await db.update(users).set({ role: "ADMIN" }).where(eq(users.id, cora));
      try {
        expect((await resolveSession(session.token))?.actor.role).toBe("ADMIN");
      } finally {
        await db.update(users).set({ role: "EMPLOYEE" }).where(eq(users.id, cora));
      }
      expect((await resolveSession(session.token))?.actor.role).toBe("EMPLOYEE");
      expect((await db.select().from(adminScopeGrants).where(eq(adminScopeGrants.userId, cora))).length).toBe(0);
    });

    it("rolls back session creation when the audit insert fails", async () => {
      const before = await countSessions(nora);
      // A trigger fails the audit insert even for the privileged test role, proving the session row
      // rolls back with it rather than committing a session that has no success audit trail.
      await db.execute(sql`
        create or replace function scopeis_test_fail_audit_insert() returns trigger as $$
        begin raise exception 'forced certification audit failure'; end;
        $$ language plpgsql`);
      await db.execute(sql`create trigger scopeis_test_fail_audit before insert on audit_events for each row execute function scopeis_test_fail_audit_insert()`);
      try {
        await expect(beginPasswordSession({ identifier: "nora", password: approvedPassword })).rejects.toThrow();
      } finally {
        await db.execute(sql`drop trigger if exists scopeis_test_fail_audit on audit_events`);
        await db.execute(sql`drop function if exists scopeis_test_fail_audit_insert()`);
      }
      expect(await countSessions(nora)).toBe(before);
    });
  });

  describe("data hygiene", () => {
    it("never stores the approved password in any inspected column", async () => {
      for (const table of ["user_credentials", "sessions", "audit_events", "users", "admin_scope_grants"]) {
        const rows = await db.execute(sql`select (to_jsonb(t)::text) as document from ${sql.identifier(table)} t`);
        for (const row of rows.rows as { document: string }[]) expect(row.document).not.toContain(approvedPassword);
      }
    });
  });
});
