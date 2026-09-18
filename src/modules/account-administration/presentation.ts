import "server-only";
import type { SafeAccountRow } from "./repositories";

export const ACCOUNT_TIMEZONE = "Asia/Dubai";

export function formatDubaiTimestamp(value: Date | string | null, fallback = "Not available"): string {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: ACCOUNT_TIMEZONE }).format(date);
}

export function accountsAsOf(now: Date = new Date()): string {
  return `${formatDubaiTimestamp(now)} (${ACCOUNT_TIMEZONE})`;
}

export type CredentialStatus = "Configured" | "Not configured";
export type LockStatus = "Not locked" | "Temporarily locked";

/** Presentation is derived only from safe fields; a hash, salt, or pepper is never in scope here. */
export function credentialStatus(row: Pick<SafeAccountRow, "username">): CredentialStatus {
  return row.username ? "Configured" : "Not configured";
}

export function lockStatus(row: Pick<SafeAccountRow, "lockedUntil">, now: Date = new Date()): LockStatus {
  return row.lockedUntil && row.lockedUntil.getTime() > now.getTime() ? "Temporarily locked" : "Not locked";
}

export type SafeAccountRowView = {
  userId: string;
  displayName: string;
  employeeCode: string;
  username: string;
  loginEmail: string;
  role: SafeAccountRow["role"];
  active: boolean;
  credentialStatus: CredentialStatus;
  passwordChangedAt: string;
  lockStatus: LockStatus;
  mustChangePassword: boolean;
  createdAt: string;
  credentialVersion: number;
};

/**
 * Single safe projection used by both the page and its tests. It never receives a hash, salt, pepper,
 * session token, cookie, or raw audit metadata, so it cannot serialize one.
 */
export function toAccountRowView(row: SafeAccountRow, now: Date = new Date()): SafeAccountRowView {
  return {
    userId: row.userId,
    displayName: row.displayName,
    employeeCode: row.employeeCode ?? "Not assigned",
    username: row.username ?? "Not configured",
    loginEmail: row.loginEmail ?? "Not configured",
    role: row.role,
    active: row.active,
    credentialStatus: credentialStatus(row),
    passwordChangedAt: formatDubaiTimestamp(row.passwordChangedAt),
    lockStatus: lockStatus(row, now),
    mustChangePassword: row.mustChangePassword,
    createdAt: formatDubaiTimestamp(row.createdAt),
    credentialVersion: row.credentialVersion ?? 0,
  };
}

export const PASSWORDS_CANNOT_BE_VIEWED = "Passwords cannot be viewed. Set a temporary password if the user needs new credentials.";
