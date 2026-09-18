import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { sessions, userCredentials } from "@/db/schema";
import { isMockPersonaId } from "@/db/seed/fixtures";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { errors } from "@/shared/errors/app-error";
import { foundationRepository } from "@/server/repositories/foundation-repository";
import { env, mockAuthenticationIsAllowed } from "@/server/env";
import type { AuthenticatedActor } from "@/shared/types/foundation";
import { createSessionRecord, sessionTokenHash as tokenHash } from "./session-record";

export const SESSION_COOKIE = "scopeis_session";
const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: env().APP_ENV === "production", path: "/" };

async function actorForUser(userId: string, sessionId: string): Promise<AuthenticatedActor> {
  const user = await foundationRepository.findActiveUser(userId);
  if (!user) throw errors.unauthenticated();
  const scopes = await foundationRepository.activeScopeGrants(user.id);
  return { id: user.id, displayName: user.displayName, role: user.role, sessionId, sessionVersion: user.sessionVersion, scopes, authenticationMode: "mock" };
}

export async function beginMockSession(personaId: string) {
  if (!mockAuthenticationIsAllowed()) throw errors.mockUnavailable();
  if (!isMockPersonaId(personaId)) throw errors.validation();
  const actorWithoutSession = await actorForUser(personaId, "pending");
  return db.transaction((tx) => createSessionRecord(tx, actorWithoutSession, new Date(), env().SESSION_TTL_HOURS));
}

export async function setSessionCookie(token: string, expires: Date) {
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieOptions, expires });
}

export async function clearSessionCookie() { (await cookies()).set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 }); }

export async function getCurrentActor(): Promise<AuthenticatedActor | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const found = await foundationRepository.findActiveSession(tokenHash(token));
  if (!found || found.session.sessionVersion !== found.user.sessionVersion) return null;
  if (found.session.authenticationMode === "mock" && !mockAuthenticationIsAllowed()) return null;
  const scopes = await foundationRepository.activeScopeGrants(found.user.id);
  return { id: found.user.id, displayName: found.user.displayName, role: found.user.role, sessionId: found.session.id, sessionVersion: found.user.sessionVersion, scopes, authenticationMode: found.session.authenticationMode };
}

export async function requireCurrentActor() {
  const actor = await getCurrentActor();
  if (!actor) throw errors.unauthenticated();
  return actor;
}

/**
 * True when the authenticated user must change their temporary password before using the application.
 * Resolved from PostgreSQL on every protected request so the gate cannot be bypassed by a stale client.
 */
export async function mustChangePassword(userId: string): Promise<boolean> {
  const [row] = await db.select({ mustChangePassword: userCredentials.mustChangePassword }).from(userCredentials).where(sql`${userCredentials.userId} = ${userId}`);
  return Boolean(row?.mustChangePassword);
}

export async function endCurrentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return;
  const found = await foundationRepository.findActiveSession(tokenHash(token));
  await db.transaction(async (tx) => {
    await tx.update(sessions).set({ revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(sessions.tokenHash, tokenHash(token)), isNull(sessions.revokedAt)));
    if (found) await writeAuditEvent(tx, { actor: { id: found.user.id, role: found.user.role, authenticationMode: found.session.authenticationMode }, action: `auth.${found.session.authenticationMode}_session.ended`, targetType: "session", targetId: found.session.id });
  });
  await clearSessionCookie();
}
