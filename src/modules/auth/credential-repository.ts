import "server-only";
import { and, eq, or } from "drizzle-orm";
import { adminScopeGrants, userCredentials, users } from "@/db/schema";
import type { AuthTransaction } from "./session-record";

export const credentialRepository = {
  async lock(tx: AuthTransaction, identifier: string) {
    const [record] = await tx.select({ credential: userCredentials, user: users }).from(userCredentials)
      .innerJoin(users, eq(users.id, userCredentials.userId))
      .where(or(eq(userCredentials.normalizedUsername, identifier), eq(userCredentials.normalizedEmail, identifier)))
      .for("update");
    return record ?? null;
  },
  async scopes(tx: AuthTransaction, userId: string) {
    return tx.select({ type: adminScopeGrants.scopeType, reference: adminScopeGrants.scopeReference }).from(adminScopeGrants)
      .where(and(eq(adminScopeGrants.userId, userId), eq(adminScopeGrants.active, true)));
  },
  async failure(tx: AuthTransaction, credential: typeof userCredentials.$inferSelect, now: Date) {
    const expired = !credential.failureWindowStartedAt || now.getTime() - credential.failureWindowStartedAt.getTime() >= 900_000;
    const count = expired ? 1 : Math.min(5, credential.failedAttemptCount + 1);
    await tx.update(userCredentials).set({ failedAttemptCount: count,
      failureWindowStartedAt: expired ? now : credential.failureWindowStartedAt,
      lockedUntil: count >= 5 ? new Date(now.getTime() + 900_000) : null, updatedAt: now,
    }).where(eq(userCredentials.userId, credential.userId));
  },
  async reset(tx: AuthTransaction, userId: string, now: Date) {
    await tx.update(userCredentials).set({ failedAttemptCount: 0, failureWindowStartedAt: null, lockedUntil: null, updatedAt: now })
      .where(eq(userCredentials.userId, userId));
  },
};
