import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { adminScopeGrants, auditEvents, employeeProfiles, sessions, userCredentials, users } from "@/db/schema";
import { AccountAdministrationService } from "@/modules/account-administration/service";
import { accountErrorMessage } from "@/modules/account-administration/messages";
import { accountRepository, safeCredentialColumns } from "@/modules/account-administration/repositories";
import { toAccountRowView, credentialStatus, lockStatus } from "@/modules/account-administration/presentation";
import { AccountAdminDomainError } from "@/modules/account-administration/domain-error";
import { verifyPassword } from "@/modules/auth/password";
import { beginPasswordSession } from "@/modules/auth/credential-service";
import { sessionTokenHash } from "@/modules/auth/session-record";
import { foundationRepository } from "@/server/repositories/foundation-repository";
import type { AuthenticatedActor } from "@/shared/types/foundation";

const TEMP = "user1234";
const noraId = "mock-super-admin-nora";
const avaId = "mock-admin-ava";
const coraId = "mock-employee-cora";
const benId = "mock-admin-ben";

const nora = (): AuthenticatedActor => ({ id: noraId, displayName: "Nora Albright", role: "SUPER_ADMIN", sessionId: "s", sessionVersion: 1, scopes: [], authenticationMode: "password" });
const ava = (): AuthenticatedActor => ({ id: avaId, displayName: "Ava Mercer", role: "ADMIN", sessionId: "s2", sessionVersion: 1, scopes: [{ type: "TEAM", reference: "team:alpha" }], authenticationMode: "password" });
const cora = (): AuthenticatedActor => ({ id: coraId, displayName: "Cora Bell", role: "EMPLOYEE", sessionId: "s3", sessionVersion: 1, scopes: [], authenticationMode: "password" });

const service = new AccountAdministrationService();

function credentialRow(userId: string) {
  return db.select({ passwordHash: userCredentials.passwordHash, version: userCredentials.version, mustChangePassword: userCredentials.mustChangePassword, failedAttemptCount: userCredentials.failedAttemptCount, lockedUntil: userCredentials.lockedUntil }).from(userCredentials).where(eq(userCredentials.userId, userId));
}

async function hashOf(userId: string) {
  return (await credentialRow(userId))[0]?.passwordHash ?? null;
}

describe("account administration service", () => {
  describe("authorization", () => {
    it("refuses Admin and Employee actors on every method", async () => {
      for (const actor of [ava(), cora()]) {
        await expect(service.list(actor, { page: 1 })).rejects.toThrow(AccountAdminDomainError);
        await expect(service.summary(actor)).rejects.toThrow(AccountAdminDomainError);
        await expect(service.createAccount(actor, { displayName: "Fictional", username: "fictional", loginEmail: "fictional@example.test", role: "EMPLOYEE", password: TEMP, confirmPassword: TEMP })).rejects.toThrow(AccountAdminDomainError);
        await expect(service.enableCredentials(actor, { userId: coraId, username: "x1", loginEmail: "x1@example.test", password: TEMP, confirmPassword: TEMP })).rejects.toThrow(AccountAdminDomainError);
      }
    });

    it("refuses a demoted actor even with a stale SUPER_ADMIN actor object", async () => {
      await db.update(users).set({ role: "ADMIN" }).where(eq(users.id, noraId));
      try {
        await expect(service.createAccount(nora(), { displayName: "Fictional", username: "fictional", loginEmail: "fictional@example.test", role: "EMPLOYEE", password: TEMP, confirmPassword: TEMP })).rejects.toThrow(AccountAdminDomainError);
      } finally {
        await db.update(users).set({ role: "SUPER_ADMIN" }).where(eq(users.id, noraId));
      }
    });

    it("refuses an inactive actor", async () => {
      await db.update(users).set({ active: false }).where(eq(users.id, noraId));
      try {
        await expect(service.summary(nora())).rejects.toThrow(AccountAdminDomainError);
      } finally {
        await db.update(users).set({ active: true }).where(eq(users.id, noraId));
      }
    });
  });

  describe("create account", () => {
    it("creates an Employee account and profile atomically with a hashed password", async () => {
      const result = await service.createAccount(nora(), {
        displayName: "Fictional Newcomer", username: "newcomer", loginEmail: "newcomer@example.test", workEmail: "work.newcomer@example.test",
        role: "EMPLOYEE", password: TEMP, confirmPassword: TEMP, mustChangePassword: true, workPhone: "555", professionalSummary: "Fictional summary",
      });
      const user = await foundationRepository.findActiveUser(result.userId);
      expect(user?.role).toBe("EMPLOYEE");
      const [profile] = await db.select().from(employeeProfiles).where(eq(employeeProfiles.userId, result.userId));
      expect(profile?.employeeCode).toBe(result.employeeCode);
      expect(profile?.workEmail).toBe("work.newcomer@example.test");
      expect(await hashOf(result.userId)).not.toContain(TEMP);
      expect(await verifyPassword(TEMP, await hashOf(result.userId))).toBe(true);
      const audit = await db.select().from(auditEvents).where(and(eq(auditEvents.action, "auth.account.created"), eq(auditEvents.targetId, result.userId)));
      expect(audit.length).toBe(1);
      expect(JSON.stringify(audit[0].metadata)).not.toContain(TEMP);
    });

    it("creates an Admin without implicit scope grants", async () => {
      const result = await service.createAccount(nora(), { displayName: "Fictional Admin", username: "newadmin", loginEmail: "newadmin@example.test", role: "ADMIN", password: TEMP, confirmPassword: TEMP });
      expect((await db.select().from(adminScopeGrants).where(eq(adminScopeGrants.userId, result.userId))).length).toBe(0);
    });

    it("requires explicit confirmation to create another Super Admin", async () => {
      await expect(service.createAccount(nora(), { displayName: "Fictional Root", username: "newroot", loginEmail: "newroot@example.test", role: "SUPER_ADMIN", password: TEMP, confirmPassword: TEMP })).rejects.toThrow(AccountAdminDomainError);
      const result = await service.createAccount(nora(), { displayName: "Fictional Root", username: "newroot", loginEmail: "newroot@example.test", role: "SUPER_ADMIN", password: TEMP, confirmPassword: TEMP, superAdminConfirmed: true });
      expect((await foundationRepository.findActiveUser(result.userId))?.role).toBe("SUPER_ADMIN");
    });

    it("rolls back everything on duplicate username or email", async () => {
      const before = (await db.select().from(users)).length;
      await expect(service.createAccount(nora(), { displayName: "Dup One", username: "ava", loginEmail: "fresh1@example.test", role: "EMPLOYEE", password: TEMP, confirmPassword: TEMP })).rejects.toThrow(AccountAdminDomainError);
      await expect(service.createAccount(nora(), { displayName: "Dup Two", username: "fresh2", loginEmail: "AVA@example.test", role: "EMPLOYEE", password: TEMP, confirmPassword: TEMP })).rejects.toThrow(AccountAdminDomainError);
      expect((await db.select().from(users)).length).toBe(before);
    });

    it("rolls back the user and profile when the audit insert fails", async () => {
      const before = (await db.select().from(users)).length;
      await db.execute(sql`create or replace function scopeis_test_fail_audit_insert() returns trigger as $$ begin raise exception 'forced certification audit failure'; end; $$ language plpgsql`);
      await db.execute(sql`create trigger scopeis_test_fail_audit before insert on audit_events for each row execute function scopeis_test_fail_audit_insert()`);
      try {
        await expect(service.createAccount(nora(), { displayName: "Rollback Person", username: "rollbackperson", loginEmail: "rollback@example.test", role: "EMPLOYEE", password: TEMP, confirmPassword: TEMP })).rejects.toThrow();
      } finally {
        await db.execute(sql`drop trigger if exists scopeis_test_fail_audit on audit_events`);
        await db.execute(sql`drop function if exists scopeis_test_fail_audit_insert()`);
      }
      expect((await db.select().from(users)).length).toBe(before);
      expect((await db.select().from(userCredentials).where(eq(userCredentials.normalizedUsername, "rollbackperson"))).length).toBe(0);
    });

    it("rejects weak temporary passwords", async () => {
      for (const password of ["short1", "onlyletters", "12345678", "        "]) {
        await expect(service.createAccount(nora(), { displayName: "Weak Person", username: "weakperson", loginEmail: "weak@example.test", role: "EMPLOYEE", password, confirmPassword: password })).rejects.toThrow();
      }
    });
  });

  describe("enable credentials", () => {
    it("enables sign-in for a workforce record without credentials and bumps session version", async () => {
      await db.insert(users).values({ id: "fictional-no-creds", displayName: "Fictional No Creds", role: "EMPLOYEE" });
      await db.insert(employeeProfiles).values({ userId: "fictional-no-creds", employeeCode: "9901", workEmail: "work.only@example.test" });
      const before = (await db.select().from(users).where(eq(users.id, "fictional-no-creds")))[0];
      await service.enableCredentials(nora(), { userId: "fictional-no-creds", username: "nocreds", loginEmail: "nocreds@example.test", password: TEMP, confirmPassword: TEMP, mustChangePassword: true });
      const after = (await db.select().from(users).where(eq(users.id, "fictional-no-creds")))[0];
      expect(after.sessionVersion).toBe(before.sessionVersion + 1);
      expect(after.role).toBe("EMPLOYEE");
      expect((await db.select().from(employeeProfiles).where(eq(employeeProfiles.userId, "fictional-no-creds")))[0].workEmail).toBe("work.only@example.test");
    });

    it("refuses to silently overwrite an existing credential", async () => {
      const before = await hashOf(coraId);
      await expect(service.enableCredentials(nora(), { userId: coraId, username: "cora2", loginEmail: "cora2@example.test", password: TEMP, confirmPassword: TEMP })).rejects.toThrow(AccountAdminDomainError);
      expect(await hashOf(coraId)).toBe(before);
    });
  });

  describe("password reset", () => {
    it("changes hash and salt, clears lock, bumps version, revokes sessions and audits once", async () => {
      const created = await service.createAccount(nora(), { displayName: "Reset Target", username: "resettarget", loginEmail: "resettarget@example.test", role: "EMPLOYEE", password: TEMP, confirmPassword: TEMP, mustChangePassword: false });
      const login = await beginPasswordSession({ identifier: "resettarget", password: TEMP });
      const beforeHash = await hashOf(created.userId);
      const version = (await credentialRow(created.userId))[0].version;
      await db.update(userCredentials).set({ failedAttemptCount: 5, lockedUntil: new Date(Date.now() + 600_000), failureWindowStartedAt: new Date() }).where(eq(userCredentials.userId, created.userId));

      const result = await service.resetPassword(nora(), { userId: created.userId, expectedVersion: version, password: "reset-pass1", confirmPassword: "reset-pass1", mustChangePassword: true, confirmRevoke: true });
      expect(result.credentialVersion).toBe(version + 1);
      expect(result.sessionsRevoked).toBeGreaterThanOrEqual(1);

      const after = (await credentialRow(created.userId))[0];
      expect(after.passwordHash).not.toBe(beforeHash);
      expect(after.passwordHash.split("$")[5]).not.toBe(beforeHash!.split("$")[5]);
      expect(after.failedAttemptCount).toBe(0);
      expect(after.lockedUntil).toBeNull();
      expect(after.mustChangePassword).toBe(true);

      // Old password fails; new temporary password authenticates.
      await expect(beginPasswordSession({ identifier: "resettarget", password: TEMP })).rejects.toThrow();
      const again = await beginPasswordSession({ identifier: "resettarget", password: "reset-pass1" });
      expect(again.actor.id).toBe(created.userId);

      // The pre-reset session is invalidated by the bumped session version.
      const stale = await foundationRepository.findActiveSession(sessionTokenHash(login.token));
      expect(!stale || stale.session.sessionVersion !== stale.user.sessionVersion).toBe(true);

      const audit = await db.select().from(auditEvents).where(and(eq(auditEvents.action, "auth.password.reset"), eq(auditEvents.targetId, created.userId)));
      expect(audit.length).toBe(1);
      expect(JSON.stringify(audit[0].metadata)).not.toContain("reset-pass1");
    });

    it("rejects a stale credential version", async () => {
      const version = (await credentialRow(benId))[0].version;
      await expect(service.resetPassword(nora(), { userId: benId, expectedVersion: version + 5, password: TEMP, confirmPassword: TEMP, confirmRevoke: true })).rejects.toThrow(AccountAdminDomainError);
    });

    it("requires the acting password and confirmation to reset another Super Admin", async () => {
      const root = await service.createAccount(nora(), { displayName: "Second Root", username: "secondroot", loginEmail: "secondroot@example.test", role: "SUPER_ADMIN", password: TEMP, confirmPassword: TEMP, superAdminConfirmed: true });
      const version = (await credentialRow(root.userId))[0].version;
      await expect(service.resetPassword(nora(), { userId: root.userId, expectedVersion: version, password: TEMP, confirmPassword: TEMP, confirmRevoke: true })).rejects.toThrow(AccountAdminDomainError);
      await expect(service.resetPassword(nora(), { userId: root.userId, expectedVersion: version, password: TEMP, confirmPassword: TEMP, confirmRevoke: true, currentPassword: "wrong-current" })).rejects.toThrow(AccountAdminDomainError);
    });

    it("leaves an inactive account inactive and does not change its role", async () => {
      const created = await service.createAccount(nora(), { displayName: "Inactive Person", username: "inactiveperson", loginEmail: "inactive@example.test", role: "ADMIN", password: TEMP, confirmPassword: TEMP });
      await db.update(users).set({ active: false }).where(eq(users.id, created.userId));
      const version = (await credentialRow(created.userId))[0].version;
      await service.resetPassword(nora(), { userId: created.userId, expectedVersion: version, password: "inactive-reset1", confirmPassword: "inactive-reset1", confirmRevoke: true });
      const [row] = await db.select({ active: users.active, role: users.role }).from(users).where(eq(users.id, created.userId));
      expect(row.active).toBe(false);
      expect(row.role).toBe("ADMIN");
    });
  });

  describe("self password change", () => {
    it("clears the requirement, rotates the session, and audits without password content", async () => {
      const created = await service.createAccount(nora(), { displayName: "Self Changer", username: "selfchanger", loginEmail: "selfchanger@example.test", role: "EMPLOYEE", password: TEMP, confirmPassword: TEMP, mustChangePassword: true });
      const actor: AuthenticatedActor = { id: created.userId, displayName: "Self Changer", role: "EMPLOYEE", sessionId: "s", sessionVersion: 1, scopes: [], authenticationMode: "password" };
      const session = await service.changeOwnPassword(actor, { currentPassword: TEMP, newPassword: "brand-new-pass1", confirmPassword: "brand-new-pass1" });
      expect(session.token).toHaveLength(43);
      expect((await credentialRow(created.userId))[0].mustChangePassword).toBe(false);
      await expect(beginPasswordSession({ identifier: "selfchanger", password: TEMP })).rejects.toThrow();
      await expect(beginPasswordSession({ identifier: "selfchanger", password: "brand-new-pass1" })).resolves.toBeTruthy();
      const audit = await db.select().from(auditEvents).where(and(eq(auditEvents.action, "auth.password.changed"), eq(auditEvents.targetId, created.userId)));
      expect(audit.length).toBe(1);
      expect(JSON.stringify(audit[0].metadata)).not.toContain("brand-new-pass1");
    });

    it("rejects a wrong current password and a reused new password", async () => {
      const created = await service.createAccount(nora(), { displayName: "Self Guard", username: "selfguard", loginEmail: "selfguard@example.test", role: "EMPLOYEE", password: TEMP, confirmPassword: TEMP, mustChangePassword: true });
      const actor: AuthenticatedActor = { id: created.userId, displayName: "Self Guard", role: "EMPLOYEE", sessionId: "s", sessionVersion: 1, scopes: [], authenticationMode: "password" };
      await expect(service.changeOwnPassword(actor, { currentPassword: "wrong-current", newPassword: "another-pass1", confirmPassword: "another-pass1" })).rejects.toThrow(AccountAdminDomainError);
      await expect(service.changeOwnPassword(actor, { currentPassword: TEMP, newPassword: TEMP, confirmPassword: TEMP })).rejects.toThrow(AccountAdminDomainError);
    });
  });

  describe("safe projections", () => {
    it("never selects or serializes a password hash", async () => {
      expect(Object.keys(safeCredentialColumns)).not.toContain("passwordHash");
      const rows = await accountRepository.list(db, { page: 1 });
      const serialized = JSON.stringify(rows.items);
      expect(serialized).not.toMatch(/password_hash|passwordHash|scrypt\$/);
      const view = toAccountRowView(rows.items[0]);
      expect(JSON.stringify(view)).not.toMatch(/scrypt\$|passwordHash/);
    });

    it("derives credential and lock status from safe fields only", () => {
      expect(credentialStatus({ username: "nora" })).toBe("Configured");
      expect(credentialStatus({ username: null })).toBe("Not configured");
      expect(lockStatus({ lockedUntil: new Date(Date.now() + 60_000) })).toBe("Temporarily locked");
      expect(lockStatus({ lockedUntil: new Date(Date.now() - 60_000) })).toBe("Not locked");
      expect(lockStatus({ lockedUntil: null })).toBe("Not locked");
    });
  });

  describe("concurrency and preservation", () => {
    it("cannot duplicate a username under concurrent creation", async () => {
      const attempts = await Promise.allSettled([
        service.createAccount(nora(), { displayName: "Race One", username: "raceuser", loginEmail: "race1@example.test", role: "EMPLOYEE", password: TEMP, confirmPassword: TEMP }),
        service.createAccount(nora(), { displayName: "Race Two", username: "raceuser", loginEmail: "race2@example.test", role: "EMPLOYEE", password: TEMP, confirmPassword: TEMP }),
      ]);
      const fulfilled = attempts.filter((attempt) => attempt.status === "fulfilled");
      expect(fulfilled.length).toBe(1);
      const duplicates = await db.select().from(userCredentials).where(eq(userCredentials.normalizedUsername, "raceuser"));
      expect(duplicates.length).toBe(1);
    });

    it("keeps role, scope, and audit events unchanged on a plain reset", async () => {
      const version = (await credentialRow(avaId))[0].version;
      await service.resetPassword(nora(), { userId: avaId, expectedVersion: version, password: "ava-reset1", confirmPassword: "ava-reset1", confirmRevoke: true });
      expect((await foundationRepository.findActiveUser(avaId))?.role).toBe("ADMIN");
      expect(await foundationRepository.activeScopeGrants(avaId)).toEqual([{ type: "TEAM", reference: "team:alpha" }]);
    });
  });

  it("maps domain errors to safe messages without echoing input", () => {
    expect(accountErrorMessage(new AccountAdminDomainError("DUPLICATE_IDENTITY"))).toBe("That username or login email is already in use.");
    expect(accountErrorMessage(new Error("postgresql://user:pass@host/db"))).toBe("The account change could not be saved. Please try again.");
  });
});
