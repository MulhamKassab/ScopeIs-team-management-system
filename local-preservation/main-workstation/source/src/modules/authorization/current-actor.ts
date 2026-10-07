import "server-only";
import { foundationRepository } from "@/server/repositories/foundation-repository";
import type { ScopeGrant, SystemRole } from "@/shared/types/foundation";

export type CurrentActor = { id: string; role: SystemRole; scopes: ScopeGrant[] };

/**
 * Re-reads the acting user's current role, current active status, and current scope grants.
 *
 * The Phase 10 authorization remediation established that a caller-supplied actor object must never be
 * trusted for a management read: a demoted, deactivated, or re-scoped user must lose access on the very
 * next request. This helper is the single implementation of that rule for modules that need it.
 *
 * Returns `null` when the user no longer exists or is inactive, so each caller can raise its own
 * non-enumerating domain error.
 */
export async function resolveCurrentActor(actor: { id: string }): Promise<CurrentActor | null> {
  const user = await foundationRepository.findActiveUser(actor.id);
  if (!user) return null;
  return { id: user.id, role: user.role, scopes: await foundationRepository.activeScopeGrants(user.id) };
}

/** Narrowed scope helpers so every report applies one definition of "in scope". */
export type ResolvedScope = {
  role: SystemRole;
  teams: string[];
  clientIds: string[];
  projectIds: string[];
  locationIds: string[];
  isGlobal: boolean;
};

export function resolveScope(actor: CurrentActor): ResolvedScope {
  const byType = (type: ScopeGrant["type"]) => actor.scopes.filter((scope) => scope.type === type).map((scope) => scope.reference);
  return {
    role: actor.role,
    isGlobal: actor.role === "SUPER_ADMIN",
    teams: byType("TEAM"),
    clientIds: byType("CLIENT"),
    projectIds: byType("PROJECT"),
    locationIds: byType("LOCATION"),
  };
}

/** Mirrors `canReadEmployee`: an Admin reaches an employee only through a TEAM grant for that team. */
export function employeeInScope(scope: ResolvedScope, team: string | null) {
  if (scope.isGlobal) return true;
  if (scope.role !== "ADMIN" || team === null) return false;
  return scope.teams.includes(team);
}

/** Mirrors `schedulingService.requirePeriod`: client of the period, or project/location of the assignment. */
export function assignmentInScope(scope: ResolvedScope, assignment: { clientId: string; projectId: string; locationId: string }) {
  if (scope.isGlobal) return true;
  if (scope.role !== "ADMIN") return false;
  return scope.clientIds.includes(assignment.clientId)
    || scope.projectIds.includes(assignment.projectId)
    || scope.locationIds.includes(assignment.locationId);
}
