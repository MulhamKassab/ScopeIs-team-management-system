import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  required: true,
  cookieValue: "fictional-session-token",
  cookieSet: vi.fn(),
  findActiveSession: vi.fn(),
  createAccount: vi.fn(),
  resetPassword: vi.fn(),
  changeOwnPassword: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: state.cookieValue }), set: state.cookieSet }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/server/env", () => ({ env: () => ({ APP_ENV: "test", SESSION_TTL_HOURS: 24 }), mockAuthenticationIsAllowed: () => false }));
vi.mock("@/server/repositories/foundation-repository", () => ({ foundationRepository: { findActiveSession: state.findActiveSession, activeScopeGrants: async () => [] } }));
vi.mock("@/db/client", () => ({ db: { select: () => ({ from: () => ({ where: async () => [{ mustChangePassword: state.required }] }) }) } }));
vi.mock("@/modules/account-administration/service", () => ({ accountAdministrationService: {
  createAccount: state.createAccount, resetPassword: state.resetPassword, changeOwnPassword: state.changeOwnPassword,
} }));

const { getCurrentActor, requireCurrentActor, getCurrentPasswordChangeActor } = await import("@/modules/auth/session-service");
const { createAccountAction, resetPasswordAction, changeOwnPasswordAction } = await import("@/modules/account-administration/actions");
const { GET } = await import("@/app/api/foundation/scope/[scopeRef]/route");

describe("required password change at the session boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.required = true;
    state.cookieValue = "fictional-session-token";
    state.findActiveSession.mockResolvedValue({
      session: { id: "session-1", authenticationMode: "password", sessionVersion: 1 },
      user: { id: "user-1", displayName: "Fictional User", role: "SUPER_ADMIN", sessionVersion: 1 },
    });
  });

  it("withholds the business actor but allows the self-only password-change identity", async () => {
    await expect(getCurrentActor()).resolves.toBeNull();
    await expect(requireCurrentActor()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(getCurrentPasswordChangeActor()).resolves.toMatchObject({ id: "user-1" });
    state.required = false;
    await expect(getCurrentActor()).resolves.toMatchObject({ id: "user-1" });
  });

  it("refuses a direct authenticated API call until the required change is complete", async () => {
    const context = { params: Promise.resolve({ scopeRef: "team:alpha" }) };
    const response = await GET(new Request("http://localhost/api/foundation/scope/team:alpha"), context);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "UNAUTHENTICATED" });
    state.required = false;
    expect((await GET(new Request("http://localhost/api/foundation/scope/team:alpha"), context)).status).toBe(200);
  });

  it("refuses a direct business Server Action without reaching its service", async () => {
    await expect(createAccountAction({}, new FormData())).rejects.toThrow("redirect:/login");
    expect(state.createAccount).not.toHaveBeenCalled();
  });

  it.each(["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] as const)("keeps the %s password-change action available and rotates its cookie before its role landing", async (role) => {
    state.findActiveSession.mockResolvedValue({
      session: { id: "session-1", authenticationMode: "password", sessionVersion: 1 },
      user: { id: "user-1", displayName: "Fictional User", role, sessionVersion: 1 },
    });
    const expiresAt = new Date("2027-01-01T00:00:00Z");
    state.changeOwnPassword.mockResolvedValue({ token: "rotated-token", expiresAt });
    const form = new FormData();
    form.set("currentPassword", "temporary1");
    form.set("newPassword", "replacement1");
    form.set("confirmPassword", "replacement1");
    await expect(changeOwnPasswordAction({}, form)).rejects.toThrow(`redirect:${role === "EMPLOYEE" ? "/tickets" : "/dashboard"}`);
    expect(state.changeOwnPassword).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1" }), expect.anything());
    expect(state.cookieSet).toHaveBeenCalledWith("scopeis_session", "rotated-token", expect.objectContaining({ expires: expiresAt, httpOnly: true, sameSite: "lax" }));
  });

  it.each([true, false])("persists the rotated self-reset cookie (requires change: %s)", async (required) => {
    state.required = false;
    const expiresAt = new Date("2027-01-01T00:00:00Z");
    state.resetPassword.mockResolvedValue({ session: { token: "self-reset-token", expiresAt }, mustChangePassword: required });
    const result = resetPasswordAction({}, new FormData());
    if (required) await expect(result).rejects.toThrow("redirect:/account/change-password");
    else await expect(result).resolves.toEqual({ success: "Password reset completed. Existing sessions were revoked." });
    expect(state.cookieSet).toHaveBeenCalledWith("scopeis_session", "self-reset-token", expect.objectContaining({ expires: expiresAt }));
  });

  it("does not rotate the acting account's cookie when resetting somebody else", async () => {
    state.required = false;
    state.resetPassword.mockResolvedValue({ session: undefined, mustChangePassword: true });
    await resetPasswordAction({}, new FormData());
    expect(state.cookieSet).not.toHaveBeenCalled();
  });

  it("never grants a password-change identity to an expired or version-revoked session", async () => {
    state.findActiveSession.mockResolvedValueOnce(null);
    await expect(getCurrentPasswordChangeActor()).resolves.toBeNull();
    state.findActiveSession.mockResolvedValueOnce({ session: { sessionVersion: 1 }, user: { sessionVersion: 2 } });
    await expect(getCurrentPasswordChangeActor()).resolves.toBeNull();
  });
});
