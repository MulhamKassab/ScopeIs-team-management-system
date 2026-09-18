import "server-only";
import { db } from "@/db/client";
import { auditEvents } from "@/db/schema";
import { env } from "@/server/env";
import { errors } from "@/shared/errors/app-error";
import { credentialLoginSchema, normalizeIdentifier } from "./credential-validation";
import { credentialRepository } from "./credential-repository";
import { passwordPepper, verifyPassword } from "./password";
import { createSessionRecord } from "./session-record";

export async function beginPasswordSession(input: unknown, clock: () => Date = () => new Date()) {
  const { identifier, password } = credentialLoginSchema.parse(input);
  const pepper = passwordPepper();
  const result = await db.transaction(async (tx) => {
    const record = await credentialRepository.lock(tx, normalizeIdentifier(identifier));
    const valid = await verifyPassword(password, record?.credential.passwordHash ?? null, pepper);
    const now = clock();
    const locked = record?.credential.lockedUntil && record.credential.lockedUntil > now;
    if (!record || !valid || !record.user.active || locked) {
      if (record && !locked) await credentialRepository.failure(tx, record.credential, now);
      const reason = locked ? "locked" : record && !record.user.active ? "inactive" : "invalid_credentials";
      await tx.insert(auditEvents).values({ authenticationMode: "password", action: "auth.password_session.refused",
        targetType: "authentication", metadata: { reason } });
      return null;
    }
    await credentialRepository.reset(tx, record.user.id, now);
    const scopes = await credentialRepository.scopes(tx, record.user.id);
    return createSessionRecord(tx, { id: record.user.id, displayName: record.user.displayName, role: record.user.role,
      sessionId: "pending", sessionVersion: record.user.sessionVersion, authenticationMode: "password", scopes }, now, env().SESSION_TTL_HOURS);
  });
  // Refusals commit counters before the public error is thrown.
  if (!result) throw errors.invalidCredentials();
  return result;
}
