// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { LoginScreen } from "@/app/(auth)/login/login-screen";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/db/client", () => { throw new Error("Database import forbidden in login component tests."); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); push.mockClear(); });
describe("credential login form", () => {
  it("has labeled autocomplete fields and an accessible visibility control without account disclosure", () => {
    render(<LoginScreen />);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeVisible();
    expect(screen.getByLabelText("Username or email")).toHaveAttribute("autocomplete", "username");
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
    expect(document.body.textContent).not.toMatch(/Nora|Ava|Ben|Cora|Dan|persona|mock|Team Alpha|Admin|Employee/);
    expect(screen.queryByRole("radio")).toBeNull();
  });
  it("submits a semantic keyboard form and exposes its pending state", async () => {
    let finish: (response: unknown) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { finish = resolve; })));
    render(<LoginScreen />);
    fireEvent.change(screen.getByLabelText("Username or email"), { target: { value: "fictional" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "unit-secret" } });
    const button = screen.getByRole("button", { name: "Sign in" });
    expect(button).toHaveAttribute("type", "submit");
    fireEvent.submit(button.closest("form")!);
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    finish({ ok: true, json: async () => ({ redirectTo: "/dashboard" }) });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });
  it.each([[401, "INVALID_CREDENTIALS", "The username/email or password is incorrect."], [503, "AUTH_UNAVAILABLE", "Sign in is temporarily unavailable. Please contact your administrator."]])("safely renders failure %s", async (status, error, message) => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status, json: async () => ({ error, message: "untrusted internal detail" }) })));
    render(<LoginScreen />);
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }).closest("form")!);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(message));
    expect(document.body.textContent).not.toContain("untrusted");
  });
  it("has no database dependency", () => {
    expect(readFileSync("src/app/(auth)/login/login-screen.tsx", "utf8")).not.toContain("@/db/client");
  });
});
