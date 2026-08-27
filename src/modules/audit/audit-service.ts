import "server-only";
import { db } from "@/db/client";
import { auditEvents } from "@/db/schema";
import type { AuthenticatedActor } from "@/shared/types/foundation";

const blockedMetadataKeys = new Set(["token", "session", "cookie", "password", "reason", "address", "coordinates", "authorization"]);

export function sanitizeAuditMetadata(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([key]) => !blockedMetadataKeys.has(key.toLowerCase())));
}

type AuditDb = Pick<typeof db, "insert">;

export async function writeAuditEvent(db: AuditDb, event: {
  actor: Pick<AuthenticatedActor, "id" | "role" | "authenticationMode"> | null;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditEvents).values({
    actorUserId: event.actor?.id,
    actorRole: event.actor?.role,
    authenticationMode: event.actor?.authenticationMode ?? "mock",
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    metadata: sanitizeAuditMetadata(event.metadata ?? {}),
  });
}
