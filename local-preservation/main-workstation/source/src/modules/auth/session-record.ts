import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { db } from "@/db/client";
import { sessions } from "@/db/schema";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { errors } from "@/shared/errors/app-error";
import type { AuthenticatedActor } from "@/shared/types/foundation";

export type AuthTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const sessionTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function sessionExpiry(now: Date, ttlHours: number) {
  if (!Number.isInteger(ttlHours) || ttlHours < 1 || ttlHours > 168) throw errors.authUnavailable();
  return new Date(now.getTime() + ttlHours * 3_600_000);
}

export async function createSessionRecord(tx: AuthTransaction, actor: AuthenticatedActor, now: Date, ttlHours: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = sessionExpiry(now, ttlHours);
  const [created] = await tx.insert(sessions).values({ userId: actor.id, tokenHash: sessionTokenHash(token),
    authenticationMode: actor.authenticationMode, sessionVersion: actor.sessionVersion, expiresAt }).returning({ id: sessions.id });
  if (!created) throw errors.database();
  await writeAuditEvent(tx, { actor, action: `auth.${actor.authenticationMode}_session.started`, targetType: "session", targetId: created.id });
  return { token, expiresAt, actor: { ...actor, sessionId: created.id } };
}
