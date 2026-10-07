import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPersonas } from "@/db/seed/fixtures";
import { errors } from "@/shared/errors/app-error";

const state = vi.hoisted(() => ({
  mockAllowed: true,
  cookieValue: "opaque-session-token",
  cookieSet: vi.fn(),
  findActiveUser: vi.fn(),
  findActiveSession: vi.fn(),
  updateWhere: vi.fn(),
  writeAuditEvent: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: state.cookieValue }), set: state.cookieSet }) }));
vi.mock("@/server/env", () => ({ env: () => ({ SESSION_TTL_HOURS: 24 }), mockAuthenticationIsAllowed: () => state.mockAllowed }));
vi.mock("@/server/repositories/foundation-repository", () => ({ foundationRepository: { findActiveUser: state.findActiveUser, findActiveSession: state.findActiveSession, activeScopeGrants: vi.fn() } }));
vi.mock("@/modules/audit/audit-service", () => ({ writeAuditEvent: state.writeAuditEvent }));
vi.mock("@/db/client", () => ({ db: { transaction: async (callback: (tx: unknown) => unknown) => callback({ update: () => ({ set: () => ({ where: state.updateWhere }) }) }) } }));

const { beginMockSession, endCurrentSession } = await import("@/modules/auth/session-service");

describe("mock authentication boundaries", () => {
  beforeEach(() => {
    state.mockAllowed = true;
    state.cookieValue = "opaque-session-token";
    state.cookieSet.mockReset();
    state.findActiveUser.mockReset();
    state.findActiveSession.mockReset();
    state.updateWhere.mockReset();
    state.writeAuditEvent.mockReset();
  });

  it("keeps the persona catalog limited to the five fictional accounts", () => {
    expect(mockPersonas.map((persona) => persona.displayName)).toEqual(["Nora Albright", "Ava Mercer", "Ben Iqbal", "Cora Bell", "Dan Rowan"]);
  });

  it("rejects arbitrary persona identifiers before a database operation", async () => {
    await expect(beginMockSession("arbitrary-browser-supplied-id")).rejects.toThrow(errors.validation().message);
    expect(state.findActiveUser).not.toHaveBeenCalled();
  });

  it("rejects mock login when the explicit flag is disabled", async () => {
    state.mockAllowed = false;
    await expect(beginMockSession("mock-admin-ava")).rejects.toThrow(errors.mockUnavailable().message);
    expect(state.findActiveUser).not.toHaveBeenCalled();
  });

  it("revokes the server-side session and clears its cookie on logout", async () => {
    state.findActiveSession.mockResolvedValue({ session: { id: "session-1" }, user: { id: "mock-admin-ava", role: "ADMIN" } });
    await endCurrentSession();
    expect(state.updateWhere).toHaveBeenCalledOnce();
    expect(state.writeAuditEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "auth.mock_session.ended", targetId: "session-1" }));
    expect(state.cookieSet).toHaveBeenCalledWith("scopeis_session", "", expect.objectContaining({ maxAge: 0 }));
  });

  it("does not treat a raw browser token as a user identifier", () => {
    expect(createHash("sha256").update(state.cookieValue).digest("hex")).not.toBe(state.cookieValue);
  });
});
