import { describe, expect, it } from "vitest";
import { canReadEmployee, canReadManagementNote, canCreateManagementNote } from "@/modules/employees/employee-policy";

const admin = { id: "a", displayName: "A", role: "ADMIN" as const, sessionId: "s", sessionVersion: 1, authenticationMode: "mock" as const, scopes: [{ type: "TEAM" as const, reference: "team:alpha" }] };
const peer = { ...admin, id: "b" };
const employee = { id: "e", displayName: "E", role: "EMPLOYEE" as const, sessionId: "s", sessionVersion: 1, authenticationMode: "mock" as const, scopes: [] };
const superAdmin = { ...admin, id: "sa", role: "SUPER_ADMIN" as const, scopes: [] };
const subject = { userId: "e", team: "team:alpha", role: "EMPLOYEE" as const };
describe("Phase 2 employee policy", () => {
  it("enforces Admin scope and own-only employee access", () => { expect(canReadEmployee(admin, subject)).toBe(true); expect(canReadEmployee(peer, { ...subject, team: "team:bravo" })).toBe(false); expect(canReadEmployee(employee, subject)).toBe(true); expect(canReadEmployee(employee, { ...subject, userId: "other" })).toBe(false); });
  it("keeps private notes author-only and shared-upward notes away from peer Admins and subjects", () => { const privateNote = { authorUserId: "a", subjectUserId: "e", authorRole: "ADMIN" as const, visibility: "private_to_author" as const, subject }; const upward = { ...privateNote, visibility: "shared_upward" as const }; expect(canReadManagementNote(admin, privateNote)).toBe(true); expect(canReadManagementNote(peer, privateNote)).toBe(false); expect(canReadManagementNote(peer, upward)).toBe(false); expect(canReadManagementNote(superAdmin, upward)).toBe(true); expect(canReadManagementNote(employee, upward)).toBe(false); });
  it("allows Admin notes only for scoped employees", () => { expect(canCreateManagementNote(admin, subject)).toBe(true); expect(canCreateManagementNote(admin, { ...subject, role: "ADMIN" })).toBe(false); });
});

/**
 * Post-Phase-10 access-control remediation. Management-note access requires both note-level visibility
 * permission and current authorization for the subject; authorship never overrides current role or scope.
 */
describe("Management-note current-authorization policy", () => {
  const privateNote = { authorUserId: "a", subjectUserId: "e", authorRole: "ADMIN" as const, visibility: "private_to_author" as const, subject };
  const upwardNote = { ...privateNote, visibility: "shared_upward" as const };
  const demotedAuthor = { ...admin, role: "EMPLOYEE" as const };
  const authorWithoutScope = { ...admin, scopes: [] };
  const authorOnAnotherTeam = { ...admin, scopes: [{ type: "TEAM" as const, reference: "team:bravo" }] };
  const otherSuperAdmin = { ...superAdmin, id: "sa2" };

  it("requires current scope for an author's own note", () => {
    expect(canReadManagementNote(admin, privateNote)).toBe(true);
    expect(canReadManagementNote(authorWithoutScope, privateNote)).toBe(false);
    expect(canReadManagementNote(authorOnAnotherTeam, privateNote)).toBe(false);
    expect(canReadManagementNote(authorWithoutScope, upwardNote)).toBe(false);
  });

  it("never re-admits a demoted author, a peer, or the subject", () => {
    expect(canReadManagementNote(demotedAuthor, privateNote)).toBe(false);
    expect(canReadManagementNote(demotedAuthor, upwardNote)).toBe(false);
    expect(canReadManagementNote(peer, upwardNote)).toBe(false);
    expect(canReadManagementNote(employee, privateNote)).toBe(false);
    // Subject exclusion is absolute, even if that actor is upgraded to a management role.
    expect(canReadManagementNote({ ...superAdmin, id: "e" }, upwardNote)).toBe(false);
  });

  it("keeps private notes author-only and shared-upward notes Super-Admin-only", () => {
    expect(canReadManagementNote(superAdmin, privateNote)).toBe(false);
    expect(canReadManagementNote(otherSuperAdmin, privateNote)).toBe(false);
    expect(canReadManagementNote(superAdmin, upwardNote)).toBe(true);
    expect(canReadManagementNote(otherSuperAdmin, upwardNote)).toBe(true);
  });
});
