import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { auditEvents, userCredentials, users } from "@/db/schema";
import { errors } from "@/shared/errors/app-error";
import { hashPassword, passwordPepper, verifyPassword } from "./password";

export const approvedCredentialAccounts = [
  { userId: "mock-super-admin-nora", username: "nora", email: "nora@example.test", role: "SUPER_ADMIN" },
  { userId: "mock-admin-ava", username: "ava", email: "ava@example.test", role: "ADMIN" },
  { userId: "mock-admin-ben", username: "ben", email: "ben@example.test", role: "ADMIN" },
  { userId: "mock-employee-cora", username: "cora", email: "cora@example.test", role: "EMPLOYEE" },
  { userId: "mock-employee-dan", username: "dan", email: "dan@example.test", role: "EMPLOYEE" },
] as const;

// Explicit operator entry point only; never called from startup or the historical business seed.
export async function bootstrapExistingUserCredentials(password: string) {
  const pepper = passwordPepper();
  if (!password || password.length > 128) throw errors.validation();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(192718, 12)`);
    const ids = approvedCredentialAccounts.map((account) => account.userId);
    const existing = await tx.select().from(users).where(inArray(users.id, ids)).for("update");
    if (existing.length !== 5 || approvedCredentialAccounts.some((account) => !existing.some((user) => user.id === account.userId && user.role === account.role))) {
      throw new Error("Approved existing users or roles do not match. No credentials were changed.");
    }
    // Block concurrent inserts while checking the complete identity namespace.
    await tx.execute(sql`lock table user_credentials in share row exclusive mode`);
    const credentials = await tx.select().from(userCredentials);
    for (const account of approvedCredentialAccounts) {
      if (credentials.some((row) => (row.normalizedUsername === account.username || row.normalizedEmail === account.email) && row.userId !== account.userId)) {
        throw new Error("Credential identity conflict. No credentials were changed.");
      }
      const credential = credentials.find((row) => row.userId === account.userId);
      if (credential && (credential.username !== account.username || credential.email !== account.email || !await verifyPassword(password, credential.passwordHash, pepper))) {
        throw new Error("Existing credentials differ. Bootstrap does not reset credentials.");
      }
    }
    const present = credentials.filter((row) => ids.includes(row.userId as typeof ids[number]));
    if (present.length !== 0 && present.length !== 5) throw new Error("Partial credential initialization refused.");
    if (present.length === 5) return { count: 5, outcome: "unchanged", userIds: ids };
    for (const account of approvedCredentialAccounts) {
      await tx.insert(userCredentials).values({ userId: account.userId, username: account.username, normalizedUsername: account.username,
        email: account.email, normalizedEmail: account.email, passwordHash: await hashPassword(password, pepper) });
      await tx.update(users).set({ sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() }).where(eq(users.id, account.userId));
    }
    await tx.insert(auditEvents).values({ authenticationMode: "password", action: "auth.credentials.bootstrapped", targetType: "authentication", metadata: { count: 5, outcome: "initialized" } });
    return { count: 5, outcome: "initialized", userIds: ids };
  });
}
