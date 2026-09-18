import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { adminScopeGrants, userCredentials } from "@/db/schema";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { hashPassword, passwordPepper, verifyPassword } from "@/modules/auth/password";
import { createSessionRecord } from "@/modules/auth/session-record";
import { employeeProfileRepository } from "@/modules/employees/employee-repositories";
import { EmployeeDomainError } from "@/modules/employees/domain-error";
import { env } from "@/server/env";
import type { AuthenticatedActor } from "@/shared/types/foundation";
import { AccountAdminDomainError } from "./domain-error";
import { accountRepository, ACCOUNT_PAGE_SIZE, type AccountListFilter, type SafeAccountRow } from "./repositories";
import { toAccountRowView, accountsAsOf, type SafeAccountRowView } from "./presentation";
import { changePasswordSchema, createAccountSchema, enableCredentialsSchema, resetPasswordSchema, parseAccountInput } from "./validation";

type AuditWriter = typeof writeAuditEvent;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CreateAccountInput = {
  displayName: string; username: string; loginEmail: string; workEmail?: string; role: "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN";
  password: string; confirmPassword: string; mustChangePassword?: boolean; workPhone?: string; professionalSummary?: string; superAdminConfirmed?: boolean;
};
export type EnableCredentialsInput = { userId: string; username: string; loginEmail: string; password: string; confirmPassword: string; mustChangePassword?: boolean };
export type ResetPasswordInput = { userId: string; expectedVersion: number; password: string; confirmPassword: string; mustChangePassword?: boolean; confirmRevoke?: boolean; currentPassword?: string; highRiskConfirmed?: boolean };
export type ChangePasswordInput = { currentPassword: string; newPassword: string; confirmPassword: string };

export type AccountSummary = { total: number; active: number; inactive: number; configured: number; missing: number };
export type AccountPage = { items: SafeAccountRowView[]; total: number; page: number; pageSize: number; asOf: string };

/**
 * The service is the authorization and transaction boundary. Every method re-reads the acting user's
 * current role, active state, and (for self-targeting flows) the credential row inside the transaction,
 * then re-checks `SUPER_ADMIN`. Passwords are hashed immediately and never leave this module.
 */
export class AccountAdministrationService {
  constructor(private readonly auditWriter: AuditWriter = writeAuditEvent) {}

  activeSuperAdmin(actor: AuthenticatedActor) {
    if (actor.role !== "SUPER_ADMIN") throw new AccountAdminDomainError("FORBIDDEN");
    return actor;
  }

  /** Read-only paths still re-read the acting user so a stale session cannot list accounts after a demotion. */
  private async requireFreshSuperAdmin(actor: AuthenticatedActor) {
    const current = await accountRepository.findSafeById(db, actor.id);
    if (!current || !current.active || current.role !== "SUPER_ADMIN") throw new AccountAdminDomainError("FORBIDDEN");
    return current;
  }

  /** Re-reads the acting user from PostgreSQL so a stale session cannot keep acting after a demotion. */
  private async reauthorize(tx: Tx, actor: AuthenticatedActor) {
    const current = await accountRepository.findUserForUpdate(tx, actor.id);
    if (!current || !current.active || current.role !== "SUPER_ADMIN") throw new AccountAdminDomainError("FORBIDDEN");
    return current;
  }

  private async allocateEmployeeCode(tx: Tx) {
    for (;;) {
      const number = await employeeProfileRepository.allocateEmployeeCodeNumber(tx);
      if (number === null) throw new EmployeeDomainError("EMPLOYEE_CODE_CAPACITY");
      const employeeCode = String(number).padStart(4, "0");
      if (!await employeeProfileRepository.findByNormalizedEmployeeCode(tx, employeeCode)) return employeeCode;
    }
  }

  private async assertIdentityAvailable(tx: Tx, username: string, loginEmail: string, excludeUserId?: string) {
    const conflict = await accountRepository.identityConflict(tx, { username, loginEmail, excludeUserId });
    if (conflict) throw new AccountAdminDomainError("DUPLICATE_IDENTITY");
  }

  async summary(actor: AuthenticatedActor): Promise<AccountSummary> {
    await this.requireFreshSuperAdmin(actor);
    return accountRepository.summary(db);
  }

  async list(actor: AuthenticatedActor, filter: AccountListFilter): Promise<AccountPage> {
    await this.requireFreshSuperAdmin(actor);
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const result = await accountRepository.list(db, { ...filter, page, pageSize: filter.pageSize ?? ACCOUNT_PAGE_SIZE });
    const now = new Date();
    return { items: result.items.map((row) => toAccountRowView(row, now)), total: result.total, page: result.page, pageSize: result.pageSize, asOf: accountsAsOf(now) };
  }

  async accountsWithoutCredentials(actor: AuthenticatedActor) {
    await this.requireFreshSuperAdmin(actor);
    return accountRepository.listWithoutCredentials(db);
  }

  async safeAccount(actor: AuthenticatedActor, userId: string): Promise<SafeAccountRow | null> {
    await this.requireFreshSuperAdmin(actor);
    return accountRepository.findSafeById(db, userId);
  }

  /** Create an account and its workforce profile atomically, with credentials when the caller chooses a login. */
  async createAccount(actor: AuthenticatedActor, input: CreateAccountInput) {
    const parsed = parseAccountInput(createAccountSchema, input);
    const pepper = passwordPepper();
    return db.transaction(async (tx) => {
      await this.reauthorize(tx, actor);
      if (parsed.role === "SUPER_ADMIN" && !parsed.superAdminConfirmed) throw new AccountAdminDomainError("HIGH_RISK_CONFIRMATION_REQUIRED");
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`account-create:${parsed.username}:${parsed.loginEmail}`}))`);
      await this.assertIdentityAvailable(tx, parsed.username, parsed.loginEmail);
      const employeeCode = await this.allocateEmployeeCode(tx);
      const user = await employeeProfileRepository.createUser(tx, { id: `employee-${randomUUID()}`, displayName: parsed.displayName, role: parsed.role, active: true });
      await employeeProfileRepository.create(tx, {
        userId: user.id, employeeCode, workEmail: parsed.workEmail ?? parsed.loginEmail,
        workPhone: parsed.workPhone, professionalSummary: parsed.professionalSummary,
      });
      const passwordHash = await hashPassword(parsed.password, pepper);
      await accountRepository.insertCredential(tx, {
        userId: user.id, username: parsed.username, normalizedUsername: parsed.username,
        email: parsed.loginEmail, normalizedEmail: parsed.loginEmail, passwordHash,
        mustChangePassword: parsed.mustChangePassword,
      });
      await this.auditWriter(tx, { actor, action: "auth.account.created", targetType: "user", targetId: user.id, metadata: { role: parsed.role, signInEnabled: true, mustChangePassword: parsed.mustChangePassword } });
      return { userId: user.id, employeeCode, role: parsed.role };
    });
  }

  /** Enable sign-in for an existing workforce record that has no credentials. Never overwrites existing credentials. */
  async enableCredentials(actor: AuthenticatedActor, input: EnableCredentialsInput) {
    const parsed = parseAccountInput(enableCredentialsSchema, input);
    const pepper = passwordPepper();
    return db.transaction(async (tx) => {
      await this.reauthorize(tx, actor);
      const target = await accountRepository.findUserForUpdate(tx, parsed.userId);
      if (!target) throw new AccountAdminDomainError("NOT_FOUND");
      if (await accountRepository.lockCredential(tx, parsed.userId)) throw new AccountAdminDomainError("CREDENTIAL_EXISTS");
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`account-create:${parsed.username}:${parsed.loginEmail}`}))`);
      await this.assertIdentityAvailable(tx, parsed.username, parsed.loginEmail);
      const passwordHash = await hashPassword(parsed.password, pepper);
      await accountRepository.insertCredential(tx, {
        userId: parsed.userId, username: parsed.username, normalizedUsername: parsed.username,
        email: parsed.loginEmail, normalizedEmail: parsed.loginEmail, passwordHash,
        mustChangePassword: parsed.mustChangePassword,
      });
      await accountRepository.incrementSessionVersion(tx, parsed.userId);
      await this.auditWriter(tx, { actor, action: "auth.credentials.enabled", targetType: "user", targetId: parsed.userId, metadata: { signInEnabled: true, mustChangePassword: parsed.mustChangePassword } });
      return { userId: parsed.userId };
    });
  }

  /** Reset a password: new salt+hash, cleared lock, credential version bump, session revocation, one audit event. */
  async resetPassword(actor: AuthenticatedActor, input: ResetPasswordInput) {
    const parsed = parseAccountInput(resetPasswordSchema, input);
    const pepper = passwordPepper();
    return db.transaction(async (tx) => {
      await this.reauthorize(tx, actor);
      const target = await accountRepository.findUserForUpdate(tx, parsed.userId);
      if (!target) throw new AccountAdminDomainError("NOT_FOUND");
      const credential = await accountRepository.lockCredential(tx, parsed.userId);
      if (!credential) throw new AccountAdminDomainError("NOT_FOUND");
      if (credential.version !== parsed.expectedVersion) throw new AccountAdminDomainError("STALE_VERSION");

      // Self-reset and resetting another Super Admin both require the acting Super Admin's current
      // password; only resetting another Super Admin additionally requires explicit confirmation.
      const resettingAnotherSuperAdmin = target.id !== actor.id && target.role === "SUPER_ADMIN" && target.active;
      if (target.id === actor.id || resettingAnotherSuperAdmin) {
        if (!parsed.currentPassword) throw new AccountAdminDomainError("CURRENT_PASSWORD_INVALID");
        const actorCredential = await accountRepository.lockCredential(tx, actor.id);
        if (!actorCredential) throw new AccountAdminDomainError("CURRENT_PASSWORD_INVALID");
        const [actorRow] = await tx.select({ passwordHash: userCredentials.passwordHash }).from(userCredentials).where(sql`${userCredentials.userId} = ${actor.id}`);
        if (!await verifyPassword(parsed.currentPassword, actorRow?.passwordHash ?? null, pepper)) throw new AccountAdminDomainError("CURRENT_PASSWORD_INVALID");
      }
      if (resettingAnotherSuperAdmin && !parsed.highRiskConfirmed) throw new AccountAdminDomainError("HIGH_RISK_CONFIRMATION_REQUIRED");

      const passwordHash = await hashPassword(parsed.password, pepper);
      const updated = await accountRepository.updatePassword(tx, parsed.userId, { passwordHash, mustChangePassword: parsed.mustChangePassword, expectedVersion: credential.version, now: new Date() });
      if (!updated) throw new AccountAdminDomainError("STALE_VERSION");
      await accountRepository.incrementSessionVersion(tx, parsed.userId);
      const sessionsRevoked = await accountRepository.revokeSessions(tx, parsed.userId);
      await this.auditWriter(tx, { actor, action: "auth.password.reset", targetType: "user", targetId: parsed.userId, metadata: { sessionsRevoked, mustChangePassword: parsed.mustChangePassword, credentialVersion: updated.version, signInEnabled: true } });
      return { userId: parsed.userId, sessionsRevoked, credentialVersion: updated.version };
    });
  }

  /** Self-service password change; resolves the subject from the session, never from client input. */
  async changeOwnPassword(actor: AuthenticatedActor, input: ChangePasswordInput) {
    const parsed = parseAccountInput(changePasswordSchema, input);
    const pepper = passwordPepper();
    return db.transaction(async (tx) => {
      const current = await accountRepository.findUserForUpdate(tx, actor.id);
      if (!current || !current.active) throw new AccountAdminDomainError("FORBIDDEN");
      const credential = await accountRepository.lockCredential(tx, actor.id);
      if (!credential) throw new AccountAdminDomainError("NOT_FOUND");
      const [stored] = await tx.select({ passwordHash: userCredentials.passwordHash }).from(userCredentials).where(sql`${userCredentials.userId} = ${actor.id}`);
      if (!await verifyPassword(parsed.currentPassword, stored?.passwordHash ?? null, pepper)) throw new AccountAdminDomainError("CURRENT_PASSWORD_INVALID");
      const passwordHash = await hashPassword(parsed.newPassword, pepper);
      const updated = await accountRepository.updatePassword(tx, actor.id, { passwordHash, mustChangePassword: false, expectedVersion: credential.version, now: new Date() });
      if (!updated) throw new AccountAdminDomainError("STALE_VERSION");
      const nextSessionVersion = await accountRepository.incrementSessionVersion(tx, actor.id);
      await accountRepository.revokeSessions(tx, actor.id);
      await this.auditWriter(tx, { actor, action: "auth.password.changed", targetType: "user", targetId: actor.id, metadata: { mustChangePassword: false, credentialVersion: updated.version } });

      // Rotate the current session so the browser keeps working, but under the new credential version.
      const scopes = await tx.select({ type: adminScopeGrants.scopeType, reference: adminScopeGrants.scopeReference })
        .from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, actor.id), eq(adminScopeGrants.active, true)));
      const session = await createSessionRecord(tx, {
        id: actor.id, displayName: actor.displayName, role: actor.role, sessionId: "pending",
        sessionVersion: nextSessionVersion ?? current.sessionVersion + 1, authenticationMode: actor.authenticationMode,
        scopes,
      }, new Date(), env().SESSION_TTL_HOURS);
      return session;
    });
  }

}

export const accountAdministrationService = new AccountAdministrationService();
