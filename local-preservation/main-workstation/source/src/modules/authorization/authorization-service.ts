import "server-only";
import { hasRoleCapability, type Capability } from "@/modules/authorization/capabilities";
import { errors } from "@/shared/errors/app-error";
import type { AuthenticatedActor, ScopeGrant } from "@/shared/types/foundation";

export function can(actor: AuthenticatedActor, capability: Capability, resourceScope?: ScopeGrant) {
  if (!hasRoleCapability(actor.role, capability)) return false;
  if (!resourceScope || actor.role === "SUPER_ADMIN") return true;
  if (actor.role !== "ADMIN") return false;
  return actor.scopes.some((scope) => scope.type === resourceScope.type && scope.reference === resourceScope.reference);
}

export function requireCapability(actor: AuthenticatedActor, capability: Capability, resourceScope?: ScopeGrant) {
  if (!hasRoleCapability(actor.role, capability)) throw errors.forbidden();
  if (resourceScope && actor.role === "ADMIN" && !actor.scopes.some((scope) => scope.type === resourceScope.type && scope.reference === resourceScope.reference)) throw errors.outOfScope();
  if (resourceScope && actor.role === "EMPLOYEE") throw errors.forbidden();
  return actor;
}
