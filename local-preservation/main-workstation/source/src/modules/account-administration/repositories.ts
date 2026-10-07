import "server-only";
import { and, asc, count, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { employeeProfiles, sessions, userCredentials, users } from "@/db/schema";
import type { DatabaseTransaction } from "@/modules/employees/employee-repositories";

export const ACCOUNT_PAGE_SIZE = 25;

/**
 * Safe credential projection. The query selects only these columns; `password_hash` is never selected,
 * so no downstream code can leak a hash by forgetting to strip it.
 */
export const safeCredentialColumns = {
  username: userCredentials.username,
  loginEmail: userCredentials.email,
  passwordChangedAt: userCredentials.passwordChangedAt,
  lockedUntil: userCredentials.lockedUntil,
  mustChangePassword: userCredentials.mustChangePassword,
  credentialVersion: userCredentials.version,
  credentialsCreatedAt: userCredentials.createdAt,
};

export type SafeAccountRow = {
  userId: string;
  displayName: string;
  role: "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";
  active: boolean;
  userVersion: number;
  createdAt: Date;
  employeeCode: string | null;
  workEmail: string | null;
  username: string | null;
  loginEmail: string | null;
  passwordChangedAt: Date | null;
  lockedUntil: Date | null;
  mustChangePassword: boolean;
  credentialVersion: number | null;
  credentialsCreatedAt: Date | null;
};

export type AccountListFilter = {
  query?: string;
  role?: "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";
  status?: "active" | "inactive";
  credentials?: "configured" | "missing";
  page: number;
  pageSize?: number;
};

const roleText = sql<string>`${users.role}::text`;

function accountWhere(filter: AccountListFilter) {
  const conditions = [];
  if (filter.query) conditions.push(or(ilike(users.displayName, `%${filter.query}%`), ilike(userCredentials.username, `%${filter.query}%`), ilike(userCredentials.normalizedEmail, `%${filter.query}%`), ilike(employeeProfiles.employeeCode, `%${filter.query}%`)));
  if (filter.role) conditions.push(eq(roleText, filter.role));
  if (filter.status) conditions.push(eq(users.active, filter.status === "active"));
  if (filter.credentials === "configured") conditions.push(sql`${userCredentials.userId} is not null`);
  if (filter.credentials === "missing") conditions.push(isNull(userCredentials.userId));
  return conditions.length ? and(...conditions) : undefined;
}

export const accountRepository = {
  /** Paginated account list with an explicit safe column list; never selects password_hash. */
  async list(executor: typeof db | DatabaseTransaction, filter: AccountListFilter) {
    const pageSize = filter.pageSize ?? ACCOUNT_PAGE_SIZE;
    const where = accountWhere(filter);
    const [totalRecord] = await executor.select({ value: count() }).from(users)
      .leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
      .leftJoin(userCredentials, eq(userCredentials.userId, users.id))
      .where(where);
    const rows = await executor.select({
      userId: users.id, displayName: users.displayName, role: users.role, active: users.active, userVersion: users.version, createdAt: users.createdAt,
      employeeCode: employeeProfiles.employeeCode, workEmail: employeeProfiles.workEmail,
      ...safeCredentialColumns,
    }).from(users)
      .leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
      .leftJoin(userCredentials, eq(userCredentials.userId, users.id))
      .where(where)
      .orderBy(asc(users.displayName), asc(users.id))
      .limit(pageSize).offset((filter.page - 1) * pageSize);
    return { items: rows as unknown as SafeAccountRow[], total: Number(totalRecord?.value ?? 0), page: filter.page, pageSize };
  },

  async summary(executor: typeof db | DatabaseTransaction) {
    const [row] = await executor.select({
      total: count(),
      active: sql<number>`count(*) filter (where ${users.active})::int`,
      inactive: sql<number>`count(*) filter (where not ${users.active})::int`,
      configured: sql<number>`count(${userCredentials.userId})::int`,
      missing: sql<number>`count(*) filter (where ${userCredentials.userId} is null)::int`,
    }).from(users)
      .leftJoin(userCredentials, eq(userCredentials.userId, users.id));
    return {
      total: Number(row?.total ?? 0), active: Number(row?.active ?? 0), inactive: Number(row?.inactive ?? 0),
      configured: Number(row?.configured ?? 0), missing: Number(row?.missing ?? 0),
    };
  },

  /** Safe single-account projection by ID, still never selecting password_hash. */
  async findSafeById(executor: typeof db | DatabaseTransaction, userId: string) {
    const [row] = await executor.select({
      userId: users.id, displayName: users.displayName, role: users.role, active: users.active, userVersion: users.version, createdAt: users.createdAt,
      employeeCode: employeeProfiles.employeeCode, workEmail: employeeProfiles.workEmail,
      ...safeCredentialColumns,
    }).from(users)
      .leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
      .leftJoin(userCredentials, eq(userCredentials.userId, users.id))
      .where(eq(users.id, userId)).limit(1);
    return (row as unknown as SafeAccountRow | undefined) ?? null;
  },

  /** Workforce records without credentials, for the enable-sign-in selector. */
  async listWithoutCredentials(executor: typeof db | DatabaseTransaction) {
    return executor.select({ userId: users.id, displayName: users.displayName, role: users.role, active: users.active, employeeCode: employeeProfiles.employeeCode })
      .from(users)
      .innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
      .leftJoin(userCredentials, eq(userCredentials.userId, users.id))
      .where(isNull(userCredentials.userId))
      .orderBy(asc(users.displayName), asc(users.id));
  },

  /** Locks the credential row for a version-guarded mutation. Returns a safe projection plus version. */
  async lockCredential(executor: DatabaseTransaction, userId: string) {
    const [row] = await executor.select({ userId: userCredentials.userId, version: userCredentials.version, username: userCredentials.username, normalizedEmail: userCredentials.normalizedEmail })
      .from(userCredentials).where(eq(userCredentials.userId, userId)).for("update");
    return row ?? null;
  },

  async findUserForUpdate(executor: DatabaseTransaction, userId: string) {
    const [row] = await executor.select({ id: users.id, role: users.role, active: users.active, version: users.version, sessionVersion: users.sessionVersion, displayName: users.displayName })
      .from(users).where(eq(users.id, userId)).for("update");
    return row ?? null;
  },

  /** Case-insensitive identity conflict check across the credential namespace. */
  async identityConflict(executor: typeof db | DatabaseTransaction, input: { username: string; loginEmail: string; excludeUserId?: string }) {
    const [row] = await executor.select({ userId: userCredentials.userId, username: userCredentials.normalizedUsername, email: userCredentials.normalizedEmail })
      .from(userCredentials)
      .where(or(eq(userCredentials.normalizedUsername, input.username), eq(userCredentials.normalizedEmail, input.loginEmail)))
      .limit(1);
    if (!row || row.userId === input.excludeUserId) return null;
    return row.username === input.username ? "username" as const : "email" as const;
  },

  async insertCredential(executor: typeof db | DatabaseTransaction, input: typeof userCredentials.$inferInsert) {
    const [row] = await executor.insert(userCredentials).values(input).returning({ userId: userCredentials.userId });
    return row!;
  },

  async updatePassword(executor: typeof db | DatabaseTransaction, userId: string, input: { passwordHash: string; mustChangePassword: boolean; expectedVersion: number; now: Date }) {
    const [row] = await executor.update(userCredentials).set({
      passwordHash: input.passwordHash, passwordChangedAt: input.now, mustChangePassword: input.mustChangePassword,
      failedAttemptCount: 0, failureWindowStartedAt: null, lockedUntil: null,
      version: sql`${userCredentials.version} + 1`, updatedAt: input.now,
    }).where(and(eq(userCredentials.userId, userId), eq(userCredentials.version, input.expectedVersion))).returning({ userId: userCredentials.userId, version: userCredentials.version });
    return row ?? null;
  },

  async revokeSessions(executor: typeof db | DatabaseTransaction, userId: string) {
    const revoked = await executor.update(sessions).set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });
    return revoked.length;
  },

  async incrementSessionVersion(executor: typeof db | DatabaseTransaction, userId: string) {
    const [row] = await executor.update(users).set({ sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
      .where(eq(users.id, userId)).returning({ sessionVersion: users.sessionVersion });
    return row?.sessionVersion ?? null;
  },
};
