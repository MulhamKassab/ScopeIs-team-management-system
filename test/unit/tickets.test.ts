import { describe, expect, it } from "vitest";
import { canManageTicketWorkspace, canReadTicket, ticketPermissions, ticketPersonInScope } from "@/modules/tickets/policy";
import { parseTicketCommand, ticketCommandSchema, validateParticipantIds, validateTicketState } from "@/modules/tickets/validation";
import type { AuthenticatedActor } from "@/shared/types/foundation";
const id = "10000000-0000-4000-8000-000000000001";
const actor = (role: AuthenticatedActor["role"], scopes: AuthenticatedActor["scopes"] = []) => ({ id: "self", role, scopes });
const policy = { manager: false, member: true, boardStatus: "PUBLISHED" as const, creatorUserId: "other", participation: "OBSERVER" as const, archived: false };
const roles: AuthenticatedActor["role"][] = ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"];
const noPermissions = { edit: false, managePeople: false, archive: false, restore: false, log: false, files: false };
describe("Company ticket policy", () => {
  it("requires Admin membership, TEAM and a matching operational link", () => {
    const linked = { clientId: id, projectId: null };
    expect(canManageTicketWorkspace(actor("SUPER_ADMIN"), { clientId: null, projectId: null }, false)).toBe(true);
    expect(canManageTicketWorkspace(actor("EMPLOYEE"), linked, true)).toBe(false);
    expect(canManageTicketWorkspace(actor("ADMIN", [{ type: "CLIENT", reference: id }]), linked, true)).toBe(false);
    const admin = actor("ADMIN", [{ type: "TEAM", reference: "team:alpha" }, { type: "CLIENT", reference: id }]);
    expect(canManageTicketWorkspace(admin, linked, false)).toBe(false);
    expect(canManageTicketWorkspace(admin, linked, true)).toBe(true);
    expect(canManageTicketWorkspace(actor("ADMIN", [{ type: "TEAM", reference: "team:alpha" }, { type: "PROJECT", reference: id }]), { clientId: null, projectId: id }, true)).toBe(true);
    expect(canManageTicketWorkspace(admin, { clientId: null, projectId: null }, true)).toBe(false);
    expect(canManageTicketWorkspace(actor("ADMIN", [{ type: "TEAM", reference: "team:alpha" }, { type: "LOCATION", reference: id }]), linked, true)).toBe(false);
  });
  it.each(roles)("grants %s creators ticket work and People management without workspace membership", (role) => {
    const creator = actor(role);
    for (const participation of [null, "OBSERVER", "ASSIGNEE"] as const) {
      const ownTicket = { ...policy, member: false, creatorUserId: "self", participation };
      expect(canReadTicket(creator, ownTicket)).toBe(true);
      expect(ticketPermissions(creator, ownTicket)).toEqual({ edit: true, managePeople: true, archive: true, restore: false, log: true, files: true });
    }
  });
  it.each(roles)("grants %s explicit assignees work but no People or archive rights", (role) => {
    const assignee = actor(role);
    for (const member of [false, true]) {
      const assignedTicket = { ...policy, member, participation: "ASSIGNEE" as const };
      expect(canReadTicket(assignee, assignedTicket)).toBe(true);
      expect(ticketPermissions(assignee, assignedTicket)).toEqual({ edit: true, managePeople: false, archive: false, restore: false, log: true, files: true });
    }
  });
  it.each(roles)("keeps %s explicit observers read-only without requiring workspace membership", (role) => {
    const observer = actor(role);
    for (const member of [false, true]) {
      const observedTicket = { ...policy, member };
      expect(canReadTicket(observer, observedTicket)).toBe(true);
      expect(ticketPermissions(observer, observedTicket)).toEqual(noPermissions);
    }
  });
  it("does not apply Admin workforce or container scopes to an explicitly shared ticket", () => {
    const admin = actor("ADMIN", [{ type: "TEAM", reference: "team:elsewhere" }, { type: "CLIENT", reference: "another-client" }]);
    expect(canManageTicketWorkspace(admin, { clientId: id, projectId: null }, true)).toBe(false);
    expect(canReadTicket(admin, { ...policy, member: false })).toBe(true);
    expect(ticketPermissions(admin, { ...policy, member: false, participation: "ASSIGNEE" })).toEqual({ edit: true, managePeople: false, archive: false, restore: false, log: true, files: true });
  });
  it.each(roles)("refuses %s unrelated tickets even when the actor is a workspace member", (role) => {
    for (const member of [false, true]) {
      const unrelatedTicket = { ...policy, member, participation: null };
      expect(canReadTicket(actor(role), unrelatedTicket)).toBe(false);
      expect(ticketPermissions(actor(role), unrelatedTicket)).toEqual(noPermissions);
    }
  });
  it.each(roles)("hides Draft and Archived dashboards from ordinary %s ticket participants", (role) => {
    for (const boardStatus of ["DRAFT", "ARCHIVED"] as const) {
      for (const access of [{ creatorUserId: "self", participation: null }, { creatorUserId: "other", participation: "ASSIGNEE" as const }, { creatorUserId: "other", participation: "OBSERVER" as const }]) {
        const hiddenTicket = { ...policy, ...access, boardStatus };
        expect(canReadTicket(actor(role), hiddenTicket)).toBe(false);
        expect(ticketPermissions(actor(role), hiddenTicket)).toEqual(noPermissions);
      }
    }
  });
  it("retains actual manager supervision independently of participation and board state", () => {
    const manager = actor("ADMIN");
    for (const boardStatus of ["DRAFT", "PUBLISHED", "ARCHIVED"] as const) {
      expect(canReadTicket(manager, { ...policy, manager: true, member: false, participation: null, boardStatus })).toBe(true);
    }
    for (const boardStatus of ["DRAFT", "PUBLISHED"] as const) {
      expect(ticketPermissions(manager, { ...policy, manager: true, member: false, boardStatus })).toEqual({ edit: true, managePeople: true, archive: true, restore: false, log: true, files: true });
    }
  });
  it.each(roles)("keeps archived Published tickets readable to %s parties and restorable only by creator or manager", (role) => {
    const archivedTicket = { ...policy, member: false, archived: true };
    expect(canReadTicket(actor(role), archivedTicket)).toBe(true);
    expect(ticketPermissions(actor(role), archivedTicket)).toEqual(noPermissions);
    expect(ticketPermissions(actor(role), { ...archivedTicket, participation: "ASSIGNEE" })).toEqual(noPermissions);
    expect(ticketPermissions(actor(role), { ...archivedTicket, creatorUserId: "self", participation: null })).toEqual({ ...noPermissions, restore: true });
    expect(ticketPermissions(actor(role), { ...archivedTicket, manager: true })).toEqual({ ...noPermissions, restore: true });
  });
  it("keeps job titles and arbitrary team membership outside system-role access", () => {
    const admin = actor("ADMIN", [{ type: "TEAM", reference: "team:alpha" }]);
    expect(ticketPersonInScope(admin, { id: "cora", role: "EMPLOYEE", team: "team:alpha" })).toBe(true);
    expect(ticketPersonInScope(admin, { id: "dan", role: "EMPLOYEE", team: "team:bravo" })).toBe(false);
    expect(ticketPersonInScope(admin, { id: "manager", role: "ADMIN", team: "team:alpha" })).toBe(false);
    expect(ticketPersonInScope(admin, { id: "self", role: "ADMIN", team: null })).toBe(true);
    expect(ticketPersonInScope(actor("SUPER_ADMIN"), { id: "manager", role: "ADMIN", team: null })).toBe(true);
    expect(ticketPersonInScope(actor("EMPLOYEE"), { id: "cora", role: "EMPLOYEE", team: "team:alpha" })).toBe(false);
  });
});
describe("Company ticket command validation", () => {
  it("accepts distinct real dates and source state/priority values with parent versions", () => {
    expect(ticketCommandSchema.safeParse({ action: "createTicket", boardId: id, version: 1, subject: "Inspect test rack", ticketDate: "2026-10-08", dueDate: "2026-10-01" }).success).toBe(true);
    expect(ticketCommandSchema.safeParse({ action: "createTicket", boardId: id, version: 1, subject: "Inspect", ticketDate: "2026-02-30" }).success).toBe(false);
    expect(ticketCommandSchema.safeParse({ action: "createBoard", workspaceId: id, name: "Operations" }).success).toBe(false);
    expect(ticketCommandSchema.safeParse({ action: "updateTicket", ticketId: id, version: 0, status: "CLOSED" }).success).toBe(false);
    expect(ticketCommandSchema.safeParse({ action: "updateTicket", ticketId: id, version: 1 }).success).toBe(false);
    expect(ticketCommandSchema.safeParse({ action: "updateWorkspace", workspaceId: id, version: 1, name: "Support" }).success).toBe(true);
    expect(ticketCommandSchema.safeParse({ action: "updateWorkspace", workspaceId: id, version: 1 }).success).toBe(false);
    expect(ticketCommandSchema.safeParse({ action: "updateWorkspace", workspaceId: id, version: 1, name: "Support", clientId: id }).success).toBe(false);
  });
  it("refuses new roles, external support, monetary fields and unsafe text", () => {
    const valid = { action: "createTicket", boardId: id, version: 1, subject: "Inspect", ticketDate: "2026-10-08" };
    for (const extra of [{ role: "OWNER" }, { budget: 100 }, { pushedToScopeSupport: true }, { scheduleId: id }, { subject: "<script>alert(1)</script>" }]) expect(() => parseTicketCommand({ ...valid, ...extra })).toThrow();
    expect(ticketCommandSchema.safeParse({ action: "setParticipants", ticketId: id, version: 1, assigneeIds: ["self", "self"], observerIds: [] }).success).toBe(false);
    expect(() => validateParticipantIds(["self"], ["self"])).toThrow();
  });
  it("requires an On Hold reason after merging content patches", () => {
    expect(() => validateTicketState({ status: "ON_HOLD", ticketDate: "2026-10-08", onHoldReason: " " })).toThrow();
    expect(() => validateTicketState({ status: "ON_HOLD", ticketDate: "2026-10-08", onHoldReason: "Awaiting replacement part" })).not.toThrow();
    const parsed = parseTicketCommand({ action: "updateTicket", ticketId: id, version: 1, notes: "Fictional note" });
    expect(parsed).toEqual({ action: "updateTicket", ticketId: id, version: 1, notes: "Fictional note" });
  });
});
