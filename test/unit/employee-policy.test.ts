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
