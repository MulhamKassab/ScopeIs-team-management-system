import type { AuthenticatedActor } from "@/shared/types/foundation";
import type { BoardStatus, TicketPermissions } from "./types";
type PolicyActor = Pick<AuthenticatedActor, "id" | "role" | "scopes">;
type Workspace = { clientId: string | null; projectId: string | null };
/** ScopeIs TEAM/operational grants govern workspace supervision. The 9 Oct Company clarification
 * separately authorizes creator/assignee/mentioned-person sharing of an individual Published ticket
 * across all company roles and teams, without granting workspace or workforce management access. */
export function canManageTicketWorkspace(actor: PolicyActor, workspace: Workspace, isMember: boolean) {
  if (actor.role === "SUPER_ADMIN") return true;
  if (actor.role !== "ADMIN" || !isMember || !actor.scopes.some((grant) => grant.type === "TEAM")) return false;
  return actor.scopes.some((grant) => (grant.type === "CLIENT" && grant.reference === workspace.clientId) || (grant.type === "PROJECT" && grant.reference === workspace.projectId));
}
export function ticketPersonInScope(actor: PolicyActor, person: { id: string; role: string; team: string | null }) {
  if (actor.role === "SUPER_ADMIN" || actor.id === person.id) return true;
  return actor.role === "ADMIN" && person.role === "EMPLOYEE" && person.team !== null && actor.scopes.some((grant) => grant.type === "TEAM" && grant.reference === person.team);
}
export function ticketPermissions(actor: PolicyActor, input: { manager: boolean; member: boolean; boardStatus: BoardStatus; creatorUserId: string; participation: "ASSIGNEE" | "OBSERVER" | null; archived: boolean }): TicketPermissions {
  const visible = input.manager || (input.boardStatus === "PUBLISHED" && (input.creatorUserId === actor.id || input.participation !== null));
  const owns = input.creatorUserId === actor.id;
  const canWork = visible && (input.manager || owns || input.participation === "ASSIGNEE");
  return { edit: canWork && !input.archived && input.boardStatus !== "ARCHIVED", managePeople: visible && (input.manager || owns) && !input.archived && input.boardStatus !== "ARCHIVED", archive: visible && !input.archived && (input.manager || owns), restore: visible && input.archived && (input.manager || owns) && input.boardStatus !== "ARCHIVED", log: canWork && !input.archived && input.boardStatus !== "ARCHIVED", files: canWork && !input.archived && input.boardStatus !== "ARCHIVED" };
}
export function canReadTicket(actor: PolicyActor, input: Parameters<typeof ticketPermissions>[1]) {
  return input.manager || (input.boardStatus === "PUBLISHED" && (input.creatorUserId === actor.id || input.participation !== null));
}
