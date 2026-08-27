import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { sessions } from "@/db/schema";
import { mockPersonas } from "@/db/seed/fixtures";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { errors } from "@/shared/errors/app-error";
import { foundationRepository } from "@/server/repositories/foundation-repository";
import { env, mockAuthenticationIsAllowed } from "@/server/env";
import type { AuthenticatedActor } from "@/shared/types/foundation";

export const SESSION_COOKIE = "scopeis_session";
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

function expiresAt() { return new Date(Date.now() + env().SESSION_TTL_HOURS * 60 * 60 * 1000); }

async function actorForUser(userId: string, sessionId: string): Promise<AuthenticatedActor> {
  const user = await foundationRepository.findActiveUser(userId);
  if (!user) throw errors.unauthenticated();
  const scopes = await foundationRepository.activeScopeGrants(user.id);
  return { id: user.id, displayName: user.displayName, role: user.role, sessionId, sessionVersion: user.sessionVersion, scopes, authenticationMode: "mock" };
}

export async function beginMockSession(personaId: string) {
  if (!mockAuthenticationIsAllowed()) throw errors.mockUnavailable();
  if (!mockPersonas.some((persona) => persona.id === personaId)) throw errors.validation();
  const actorWithoutSession = await actorForUser(personaId, "pending");
  const token = randomBytes(32).toString("base64url");
  const expiry = expiresAt();
  const session = await db.transaction(async (tx) => {
    const [created] = await tx.insert(sessions).values({ userId: actorWithoutSession.id, tokenHash: tokenHash(token), sessionVersion: actorWithoutSession.sessionVersion, expiresAt: expiry }).returning({ id: sessions.id });
    if (!created) throw errors.database();
    await writeAuditEvent(tx, { actor: actorWithoutSession, action: "auth.mock_session.started", targetType: "session", targetId: created.id });
    return created;
  });
  return { token, expiresAt: expiry, actor: { ...actorWithoutSession, sessionId: session.id } };
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
  const scopes = await foundationRepository.activeScopeGrants(found.user.id);
  return { id: found.user.id, displayName: found.user.displayName, role: found.user.role, sessionId: found.session.id, sessionVersion: found.user.sessionVersion, scopes, authenticationMode: "mock" };
}

export async function requireCurrentActor() {
  const actor = await getCurrentActor();
  if (!actor) throw errors.unauthenticated();
  return actor;
}

export async function endCurrentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return;
  const found = await foundationRepository.findActiveSession(tokenHash(token));
  await db.transaction(async (tx) => {
    await tx.update(sessions).set({ revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(sessions.tokenHash, tokenHash(token)), isNull(sessions.revokedAt)));
    if (found) await writeAuditEvent(tx, { actor: { id: found.user.id, role: found.user.role, authenticationMode: "mock" }, action: "auth.mock_session.ended", targetType: "session", targetId: found.session.id });
  });
  await clearSessionCookie();
}
