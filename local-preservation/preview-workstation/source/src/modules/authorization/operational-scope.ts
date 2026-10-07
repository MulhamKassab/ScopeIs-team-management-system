import "server-only";
import type { AuthenticatedActor } from "@/shared/types/foundation";

export type OperationalScopeRow = { scopeType: string; scopeReference: string; active?: boolean };

/** Shared Phase 3 operational-scope semantics. TEAM grants are intentionally not operational grants. */
export function hasOperationalTargetScope(actor: Pick<AuthenticatedActor, "role">, grants: OperationalScopeRow[], targetType: "CLIENT" | "PROJECT" | "LOCATION", targetId: string, clientId: string) {
  if (actor.role === "SUPER_ADMIN") return true;
  if (actor.role !== "ADMIN") return false;
  return grants.some((grant) => grant.active !== false && (
    (grant.scopeType === "CLIENT" && grant.scopeReference === clientId)
    || (targetType === "PROJECT" && grant.scopeType === "PROJECT" && grant.scopeReference === targetId)
    || (targetType === "LOCATION" && grant.scopeType === "LOCATION" && grant.scopeReference === targetId)
  ));
}

export function hasClientManagementScope(actor: Pick<AuthenticatedActor, "role">, grants: OperationalScopeRow[], clientId: string) {
  return actor.role === "SUPER_ADMIN" || (actor.role === "ADMIN" && grants.some((grant) => grant.active !== false && grant.scopeType === "CLIENT" && grant.scopeReference === clientId));
}
