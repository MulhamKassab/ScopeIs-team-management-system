import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { adminScopeGrants, sessions, users } from "@/db/schema";
import type { ScopeGrant } from "@/shared/types/foundation";

export const foundationRepository = {
  async findActiveUser(id: string) {
    const [user] = await db.select().from(users).where(and(eq(users.id, id), eq(users.active, true))).limit(1);
    return user ?? null;
  },
  async activeScopeGrants(userId: string): Promise<ScopeGrant[]> {
    const records = await db.select({ type: adminScopeGrants.scopeType, reference: adminScopeGrants.scopeReference })
      .from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, userId), eq(adminScopeGrants.active, true)));
    return records;
  },
  async findActiveSession(tokenHash: string) {
    const [record] = await db.select({ session: sessions, user: users }).from(sessions).innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()), eq(users.active, true))).limit(1);
    return record ?? null;
  },
  async updateScopeGrantWithVersion(id: string, expectedVersion: number) {
    const updated = await db.update(adminScopeGrants).set({ version: sql`${adminScopeGrants.version} + 1`, updatedAt: new Date() })
      .where(and(eq(adminScopeGrants.id, id), eq(adminScopeGrants.version, expectedVersion))).returning({ id: adminScopeGrants.id, version: adminScopeGrants.version });
    return updated[0] ?? null;
  },
};
