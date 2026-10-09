import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SystemRole } from "@/shared/types/foundation";

const state = vi.hoisted(() => ({ actor: vi.fn(), beginPassword: vi.fn(), beginMock: vi.fn(), cookie: vi.fn(), mustChangePassword: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/modules/auth/session-service", () => ({ getCurrentActor: state.actor, getCurrentPasswordChangeActor: state.actor, mustChangePassword: state.mustChangePassword, beginMockSession: state.beginMock, setSessionCookie: state.cookie }));
vi.mock("@/modules/auth/credential-service", () => ({ beginPasswordSession: state.beginPassword }));
vi.mock("@/server/env", () => ({ mockAuthenticationIsAllowed: () => true, env: () => ({ SCOPEIS_DEMO_WORKSPACE: "false" }) }));
vi.mock("@/app/(auth)/login/login-screen", () => ({ LoginScreen: () => null }));
vi.mock("@/server/http", () => ({ requireSameOrigin: vi.fn(), errorResponse: () => Response.json({ error: "refused" }, { status: 401 }) }));

const { default: Home } = await import("@/app/page");
const { default: LoginPage } = await import("@/app/(auth)/login/page");
const { POST: passwordLogin } = await import("@/app/api/auth/login/route");
const { POST: mockLogin } = await import("@/app/api/auth/mock-login/route");

describe("role workspace landing", () => {
  beforeEach(() => { vi.clearAllMocks(); state.mustChangePassword.mockResolvedValue(false); });

  it("keeps unauthenticated root visits at sign-in", async () => {
    state.actor.mockResolvedValue(null);
    await expect(Home()).rejects.toThrow("redirect:/login");
  });

  it("preserves the temporary-password gate before the Employee workspace", async () => {
    state.actor.mockResolvedValue({ id: "fictional-employee", role: "EMPLOYEE" });
    state.mustChangePassword.mockResolvedValue(true);
    await expect(LoginPage()).rejects.toThrow("redirect:/account/change-password");
  });

  it.each(["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] as const)("uses the same %s landing from root and both sign-in providers", async (role: SystemRole) => {
    const actor = { id: "fictional-user", displayName: "Fictional User", role };
    const expected = role === "EMPLOYEE" ? "/tickets" : "/dashboard";
    const session = { actor, token: "fictional-session-token", expiresAt: new Date("2027-01-01T00:00:00Z") };
    state.actor.mockResolvedValue(actor);
    state.beginPassword.mockResolvedValue(session);
    state.beginMock.mockResolvedValue(session);

    await expect(Home()).rejects.toThrow(`redirect:${expected}`);
    await expect(LoginPage()).rejects.toThrow(`redirect:${expected}`);
    const password = await passwordLogin(new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ identifier: "fictional-user", password: "fictional-password" }) }));
    expect(await password.json()).toEqual({ redirectTo: expected });
    expect(password.headers.get("cache-control")).toContain("no-store");
    const mock = await mockLogin(new Request("http://localhost/api/auth/mock-login", { method: "POST", body: JSON.stringify({ personaId: "mock-employee-cora" }) }));
    expect(await mock.json()).toEqual({ ok: true, redirectTo: expected });
    expect(state.cookie).toHaveBeenNthCalledWith(1, session.token, session.expiresAt);
    expect(state.cookie).toHaveBeenNthCalledWith(2, session.token, session.expiresAt);
  });
});
