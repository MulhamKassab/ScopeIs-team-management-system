import { describe, expect, it } from "vitest";
import { canManageTicketWorkspace, canReadTicket, ticketPermissions, ticketPersonInScope } from "@/modules/tickets/policy";
import { parseTicketCommand, ticketCommandSchema, validateParticipantIds, validateTicketState } from "@/modules/tickets/validation";
import type { AuthenticatedActor } from "@/shared/types/foundation";
const id = "10000000-0000-4000-8000-000000000001";
const actor = (role: AuthenticatedActor["role"], scopes: AuthenticatedActor["scopes"] = []) => ({ id: "self", role, scopes });
const policy = { manager: false, member: true, boardStatus: "PUBLISHED" as const, creatorUserId: "other", participation: "OBSERVER" as const, archived: false };
describe("Company ticket policy", () => {
  it("requires Admin membership, TEAM and a matching operational link", () => {
    const linked = { clientId: id, projectId: null };
    expect(canManageTicketWorkspace(actor("SUPER_ADMIN"), { clientId: null, projectId: null }, false)).toBe(true);
    expect(canManageTicketWorkspace(actor("EMPLOYEE"), linked, true)).toBe(false);
    expect(canManageTicketWorkspace(actor("ADMIN", [{ type: "CLIENT", reference: id }]), linked, true)).toBe(false);
    const admin = actor("ADMIN", [{ type: "TEAM", reference: "team:alpha" }, { type: "CLIENT", reference: id }]);
    expect(canManageTicketWorkspace(admin, linked, false)).toBe(false);
    expect(canManageTicketWorkspace(admin, linked, true)).toBe(true);
    expect(canManageTicketWorkspace(admin, { clientId: null, projectId: null }, true)).toBe(false);
    expect(canManageTicketWorkspace(actor("ADMIN", [{ type: "TEAM", reference: "team:alpha" }, { type: "LOCATION", reference: id }]), linked, true)).toBe(false);
  });
  it("keeps observers read-only and creator/assignee work inside published membership", () => {
    const employee = actor("EMPLOYEE");
    expect(canReadTicket(employee, policy)).toBe(true);
    expect(ticketPermissions(employee, policy)).toEqual({ edit: false, managePeople: false, archive: false, restore: false, log: false, files: false });
    expect(ticketPermissions(employee, { ...policy, participation: "ASSIGNEE" })).toMatchObject({ edit: true, log: true, files: true, archive: false, managePeople: false });
    expect(ticketPermissions(employee, { ...policy, creatorUserId: "self", participation: null })).toMatchObject({ edit: true, archive: true, managePeople: false });
    for (const override of [{ member: false }, { boardStatus: "DRAFT" as const }, { boardStatus: "ARCHIVED" as const }, { participation: null }]) expect(canReadTicket(employee, { ...policy, ...override })).toBe(false);
    expect(canReadTicket(actor("ADMIN"), { ...policy, participation: "ASSIGNEE" })).toBe(false);
    expect(ticketPermissions(employee, { ...policy, creatorUserId: "self", archived: true })).toMatchObject({ edit: false, archive: false, restore: true, log: false, files: false });
  });
  it("keeps job titles and arbitrary team membership outside system-role access", () => {
    const admin = actor("ADMIN", [{ type: "TEAM", reference: "team:alpha" }]);
    expect(ticketPersonInScope(admin, { id: "cora", role: "EMPLOYEE", team: "team:alpha" })).toBe(true);
    expect(ticketPersonInScope(admin, { id: "dan", role: "EMPLOYEE", team: "team:bravo" })).toBe(false);
    expect(ticketPersonInScope(admin, { id: "manager", role: "ADMIN", team: "team:alpha" })).toBe(false);
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
