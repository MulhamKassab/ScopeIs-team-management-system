import "server-only";
import type { AuthenticatedActor, SystemRole } from "@/shared/types/foundation";
import { errors } from "@/shared/errors/app-error";
import { EmployeeDomainError } from "@/modules/employees/domain-error";

export type EmployeeAccessRecord = { userId: string; team: string | null; role: SystemRole };
export type NoteVisibility = "private_to_author" | "shared_upward";

export function canReadEmployee(actor: AuthenticatedActor, record: EmployeeAccessRecord) {
  if (actor.role === "SUPER_ADMIN" || actor.id === record.userId) return true;
  return actor.role === "ADMIN" && record.team !== null && actor.scopes.some((scope) => scope.type === "TEAM" && scope.reference === record.team);
}

export function requireEmployeeRead(actor: AuthenticatedActor, record: EmployeeAccessRecord) {
  if (!canReadEmployee(actor, record)) throw new EmployeeDomainError(actor.role === "ADMIN" ? "OUT_OF_SCOPE" : "FORBIDDEN");
}

export function canEditOwnSafeProfile(actor: AuthenticatedActor, userId: string) { return actor.id === userId; }
export function requireEmployeeAdministration(actor: AuthenticatedActor) { if (actor.role !== "SUPER_ADMIN") throw errors.forbidden(); }

export function requireSuperAdmin(actor: AuthenticatedActor) {
  if (actor.role !== "SUPER_ADMIN") throw new EmployeeDomainError("FORBIDDEN");
}

/** The confirmed self-service boundary is work contact and professional summary only. */
export function requireOwnEditableProfile(actor: AuthenticatedActor, userId: string) {
  if (actor.id !== userId) throw new EmployeeDomainError("FORBIDDEN");
}

export function canCreateManagementNote(actor: AuthenticatedActor, subject: EmployeeAccessRecord) {
  if (actor.role === "SUPER_ADMIN") return subject.role !== "SUPER_ADMIN";
  return actor.role === "ADMIN" && subject.role === "EMPLOYEE" && canReadEmployee(actor, subject);
}

export function canReadManagementNote(actor: AuthenticatedActor, note: { authorUserId: string; subjectUserId: string; authorRole: SystemRole; visibility: NoteVisibility; subject: EmployeeAccessRecord }) {
  if (actor.id === note.subjectUserId || actor.role === "EMPLOYEE") return false;
  if (actor.id === note.authorUserId) return true;
  if (note.visibility !== "shared_upward") return false;
  if (actor.role !== "SUPER_ADMIN") return false;
  return canReadEmployee(actor, note.subject);
}
