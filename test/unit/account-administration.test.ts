import { describe, expect, it } from "vitest";
import {
  changePasswordSchema, createAccountSchema, enableCredentialsSchema, resetPasswordSchema, normalizeUsername, normalizeLoginEmail,
  passwordPolicyErrors, parseAccountInput, accountFilterSchema,
} from "@/modules/account-administration/validation";
import { AccountAdminDomainError } from "@/modules/account-administration/domain-error";
import { credentialStatus, lockStatus, toAccountRowView, formatDubaiTimestamp, accountsAsOf, PASSWORDS_CANNOT_BE_VIEWED, ACCOUNT_TIMEZONE } from "@/modules/account-administration/presentation";
import type { SafeAccountRow } from "@/modules/account-administration/repositories";
import { auditMetadataFields, auditActionLabel } from "@/modules/audit/presentation";
import { accountErrorMessage } from "@/modules/account-administration/messages";

const base = {
  displayName: "Fictional Person", username: "fictional", loginEmail: "fictional@example.test", role: "EMPLOYEE" as const,
  password: "user1234", confirmPassword: "user1234",
};

describe("account administration validation", () => {
  it("normalizes usernames and login emails by trimming and lowercasing", () => {
    expect(normalizeUsername("  FiCtIoNaL.01 ")).toBe("fictional.01");
    expect(normalizeLoginEmail("  FiCtIoNaL@Example.Test ")).toBe("fictional@example.test");
  });

  it("accepts the temporary demo password and rejects weak values", () => {
    expect(createAccountSchema.safeParse(base).success).toBe(true);
    expect(passwordPolicyErrors("user1234", { username: "fictional", email: "fictional@example.test" })).toEqual([]);
    const weak = [
      { password: "short1", reason: "too short" },
      { password: "onlyletters", reason: "no number" },
      { password: "12345678", reason: "no letter" },
      { password: "        ", reason: "whitespace only" },
      { password: "fictional", reason: "equals username" },
      { password: "fictional@example.test", reason: "equals email" },
    ];
    for (const { password } of weak) expect(passwordPolicyErrors(password, { username: "fictional", email: "fictional@example.test" }).length).toBeGreaterThan(0);
  });

  it("requires matching confirmation and rejects unknown fields", () => {
    expect(createAccountSchema.safeParse({ ...base, confirmPassword: "different1" }).success).toBe(false);
    expect(createAccountSchema.safeParse({ ...base, isSuperAdmin: "true" }).success).toBe(false);
    expect(enableCredentialsSchema.safeParse({ userId: "u", username: "abc", loginEmail: "a@b.test", password: "user1234", confirmPassword: "user1234" }).success).toBe(true);
    expect(enableCredentialsSchema.safeParse({ userId: "u", username: "abc", loginEmail: "a@b.test", password: "user1234", confirmPassword: "user1234", role: "SUPER_ADMIN" }).success).toBe(false);
  });

  it("requires explicit confirmation to create a Super Admin", () => {
    expect(createAccountSchema.safeParse({ ...base, role: "SUPER_ADMIN" }).success).toBe(false);
    expect(createAccountSchema.safeParse({ ...base, role: "SUPER_ADMIN", superAdminConfirmed: true }).success).toBe(true);
  });

  it("requires revoke confirmation and a version on password reset", () => {
    expect(resetPasswordSchema.safeParse({ userId: "u", expectedVersion: 1, password: "user1234", confirmPassword: "user1234" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ userId: "u", expectedVersion: 1, password: "user1234", confirmPassword: "user1234", confirmRevoke: true }).success).toBe(true);
  });

  it("requires a distinct, policy-compliant new password for self change", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "user1234", newPassword: "user1234", confirmPassword: "user1234" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: "user1234", newPassword: "brandnew1", confirmPassword: "brandnew1" }).success).toBe(true);
  });

  it("maps validation failures to a typed domain error", () => {
    expect(() => parseAccountInput(createAccountSchema, { ...base, confirmPassword: "nope" })).toThrow(AccountAdminDomainError);
    expect(() => parseAccountInput(createAccountSchema, {})).toThrow(AccountAdminDomainError);
    expect(accountFilterSchema.safeParse({ role: "SUPER_ADMIN", status: "active", credentials: "configured", page: "2" }).success).toBe(true);
    expect(accountFilterSchema.safeParse({ role: "OWNER" }).success).toBe(false);
  });
});

describe("account administration presentation", () => {
  const row: SafeAccountRow = {
    userId: "u1", displayName: "Fictional", role: "ADMIN", active: true, userVersion: 1, createdAt: new Date("2026-01-02T03:04:00Z"),
    employeeCode: "0007", workEmail: "w@example.test", username: "fictional", loginEmail: "fictional@example.test",
    passwordChangedAt: new Date("2026-02-03T04:05:00Z"), lockedUntil: null, mustChangePassword: false, credentialVersion: 3, credentialsCreatedAt: new Date("2026-01-02T03:04:00Z"),
  };

  it("derives safe credential and lock status", () => {
    expect(credentialStatus({ username: "nora" })).toBe("Configured");
    expect(credentialStatus({ username: null })).toBe("Not configured");
    expect(lockStatus({ lockedUntil: new Date(Date.now() + 60_000) })).toBe("Temporarily locked");
    expect(lockStatus({ lockedUntil: new Date(Date.now() - 60_000) })).toBe("Not locked");
  });

  it("projects only safe fields and never a hash", () => {
    const view = toAccountRowView(row, new Date("2026-03-01T00:00:00Z"));
    expect(Object.keys(view).sort()).toEqual(["active", "createdAt", "credentialStatus", "credentialVersion", "displayName", "employeeCode", "lockStatus", "loginEmail", "mustChangePassword", "passwordChangedAt", "role", "userId", "username"].sort());
    expect(JSON.stringify(view)).not.toMatch(/scrypt\$|hash|salt|pepper|token|cookie/i);
  });

  it("formats the as-of timestamp in Asia/Dubai", () => {
    expect(ACCOUNT_TIMEZONE).toBe("Asia/Dubai");
    expect(formatDubaiTimestamp(new Date("2026-01-02T00:00:00Z"))).toMatch(/2026/);
    expect(accountsAsOf(new Date("2026-01-02T00:00:00Z"))).toContain("Asia/Dubai");
    expect(PASSWORDS_CANNOT_BE_VIEWED).toContain("cannot be viewed");
  });
});

describe("account administration audit allowlist", () => {
  it("renders only allowlisted keys for the new actions", () => {
    expect(auditMetadataFields("auth.account.created", { role: "ADMIN", signInEnabled: true, mustChangePassword: true, password: "user1234", username: "nora" })).toEqual([
      { key: "role", value: "ADMIN" }, { key: "signInEnabled", value: "yes" }, { key: "mustChangePassword", value: "yes" },
    ]);
    expect(auditMetadataFields("auth.password.reset", { sessionsRevoked: 2, mustChangePassword: true, credentialVersion: 4, signInEnabled: true, hash: "x", identifier: "nora" })).toEqual([
      { key: "sessionsRevoked", value: "2" }, { key: "mustChangePassword", value: "yes" }, { key: "credentialVersion", value: "4" }, { key: "signInEnabled", value: "yes" },
    ]);
    expect(auditMetadataFields("auth.password.changed", { mustChangePassword: false, credentialVersion: 5, password: "secret" })).toEqual([
      { key: "mustChangePassword", value: "no" }, { key: "credentialVersion", value: "5" },
    ]);
    expect(auditMetadataFields("auth.credentials.enabled", { signInEnabled: true, mustChangePassword: true })).toEqual([
      { key: "signInEnabled", value: "yes" }, { key: "mustChangePassword", value: "yes" },
    ]);
    expect(auditActionLabel("auth.account.created")).toBe("Account created");
    expect(auditActionLabel("unknown.action")).toBe("Recorded system action");
  });
});

describe("account administration error mapping", () => {
  it("returns safe messages and never echoes input", () => {
    expect(accountErrorMessage(new AccountAdminDomainError("FORBIDDEN"))).toBe("You are not authorized to manage accounts.");
    expect(accountErrorMessage(new AccountAdminDomainError("DUPLICATE_IDENTITY"))).toBe("That username or login email is already in use.");
    expect(accountErrorMessage(new AccountAdminDomainError("CREDENTIAL_EXISTS"))).toBe("This workforce record already has sign-in credentials.");
    expect(accountErrorMessage(new AccountAdminDomainError("CURRENT_PASSWORD_INVALID"))).toBe("Your current password is incorrect.");
    expect(accountErrorMessage(new Error("scrypt$v1$32768$8$1$abc$def user1234"))).toBe("The account change could not be saved. Please try again.");
  });
});
