// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmptyModule, SafeState } from "@/shared/components/states";
import { ApplicationShell } from "@/shared/components/shell";
import { navigationFor } from "@/modules/navigation/navigation";
import type { AuthenticatedActor } from "@/shared/types/foundation";
import RootNotFound from "@/app/not-found";
import RootError from "@/app/error";
import ProtectedNotFound from "@/app/(protected)/not-found";
import ProtectedError from "@/app/(protected)/error";

vi.mock("next/navigation", () => ({ usePathname: () => "/accounts", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
afterEach(cleanup);
const employee: AuthenticatedActor = { id: "fictional-user", displayName: "Fictional User", role: "EMPLOYEE", sessionId: "session", sessionVersion: 1, scopes: [], authenticationMode: "password" };

describe("Phase 1 visual states", () => {
  it("clearly identifies an intentionally empty module", () => { render(<EmptyModule title="Schedule" purpose="Planning is later." phase={4} />); expect(screen.getByText("Coming soon")).toBeInTheDocument(); expect(screen.getByRole("heading", { name: "Schedule" })).toBeInTheDocument(); expect(screen.getByText("Planning is later.")).toBeInTheDocument(); expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/dashboard"); expect(screen.getByText(/This section is planned and has no editable settings yet/)).toBeInTheDocument(); });
  it("renders a safe recovery action", () => { render(<SafeState title="Unauthorized" message="No access." />); expect(screen.getByRole("link", { name: "Return to a safe page" })).toBeInTheDocument(); });
  it.each([
    ["not found", RootNotFound, "Page not found", "This route does not exist or is not available."],
    ["error", RootError, "Something went wrong", "No internal details were exposed. Return to a safe page and try again."],
  ] as const)("gives standalone %s recovery exactly one main landmark", (_name, Fallback, title, message) => {
    render(<Fallback />);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    const main = screen.getByRole("main");
    expect(within(main).getByRole("heading", { name: title })).toBeInTheDocument();
    expect(within(main).getByText(message)).toBeInTheDocument();
    expect(within(main).getByRole("link", { name: "Return to a safe page" })).toHaveAttribute("href", "/");
  });
  it.each([
    ["not found", ProtectedNotFound, "Page not found", "This route does not exist or is not available."],
    ["error", ProtectedError, "Something went wrong", "No internal details were exposed. Return to a safe page and try again."],
  ] as const)("keeps protected %s recovery within the shell's single main landmark", (_name, Fallback, title, message) => {
    render(<ApplicationShell actor={employee} navigation={navigationFor(employee)} title="Team Management"><Fallback /></ApplicationShell>);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(within(main).getByRole("heading", { name: title })).toBeInTheDocument();
    expect(within(main).getByText(message)).toBeInTheDocument();
    expect(within(main).getByRole("link", { name: "Return to a safe page" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: "Accounts", exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#page-content");
    expect(main.querySelector("#page-content")).toContainElement(within(main).getByRole("heading", { name: title }));
  });
});
