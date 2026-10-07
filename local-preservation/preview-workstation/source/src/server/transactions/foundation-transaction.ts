import "server-only";
import { db } from "@/db/client";
import { adminScopeGrants } from "@/db/schema";
import { errors } from "@/shared/errors/app-error";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { createNotification } from "@/modules/notifications/notification-service";
import type { AuthenticatedActor } from "@/shared/types/foundation";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A representative Phase 1 atomic pattern for future operations; no business module is implemented here. */
export async function createScopeGrantWithGovernance(tx: Transaction, actor: AuthenticatedActor, input: { userId: string; scopeType: "TEAM" | "CLIENT" | "PROJECT" | "LOCATION"; scopeReference: string; notifyUserId: string; failAfterAudit?: boolean }) {
  await tx.insert(adminScopeGrants).values({ userId: input.userId, scopeType: input.scopeType, scopeReference: input.scopeReference });
  await writeAuditEvent(tx, { actor, action: "foundation.scope_grant.created", targetType: "scope_grant", targetId: input.scopeReference });
  if (input.failAfterAudit) throw errors.database();
  await createNotification(tx, { recipientUserId: input.notifyUserId, eventType: "foundation.scope_grant.updated", relatedRecordType: "scope_grant", relatedRecordId: input.scopeReference });
}
