// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationShell } from "@/shared/components/shell";
import { modules, navigationFor } from "@/modules/navigation/navigation";
import type { AuthenticatedActor } from "@/shared/types/foundation";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
afterEach(cleanup);
const actor: AuthenticatedActor = { id: "fictional-user", displayName: "Fictional User", role: "SUPER_ADMIN", sessionId: "session", sessionVersion: 1, scopes: [], authenticationMode: "password" };

function openMore() {
  render(<ApplicationShell actor={actor} navigation={[modules.dashboard, modules.reports]} title="Team Management"><button>Background action</button></ApplicationShell>);
  const trigger = screen.getByRole("button", { name: "More" });
  trigger.focus();
  fireEvent.click(trigger);
  return { trigger, dialog: screen.getByRole("dialog", { name: "More navigation" }) };
}

describe("mobile More navigation dialog", () => {
  it("gives Employee Tickets, Schedule, Vacations and profile while More preserves personal updates", () => {
    const employee = { ...actor, role: "EMPLOYEE" as const };
    render(<ApplicationShell actor={employee} navigation={navigationFor(employee)} title="Team Management"><p>Employee work</p></ApplicationShell>);
    const primary = screen.getByRole("navigation", { name: "Mobile primary navigation" });
    expect(within(primary).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/tickets", "/schedule", "/leave", "/profile"]);
    expect(within(primary).getByRole("link", { name: "Vacations" })).toHaveTextContent("Vacations");
    expect(screen.queryByText("Ticket System")).not.toBeInTheDocument();
    fireEvent.click(within(primary).getByRole("button", { name: "More" }));
    const dialog = screen.getByRole("dialog", { name: "More navigation" });
    expect(within(dialog).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/dashboard");
    expect(within(dialog).getByRole("link", { name: "Notifications" })).toHaveAttribute("href", "/notifications");
    expect(within(dialog).getByRole("link", { name: "My requests" })).toHaveAttribute("href", "/requests");
    expect(within(dialog).queryByRole("link", { name: "People" })).not.toBeInTheDocument();
  });

  it("moves focus inside, marks the background inert, and restores focus and scrolling on Escape", () => {
    document.body.style.overflow = "auto";
    const { trigger, dialog } = openMore();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByRole("button", { name: "Close more navigation" })).toHaveFocus();
    for (const selector of [".skip-link", ".sidebar", ".top-header", "main", ".bottom-nav"]) {
      expect(document.querySelector(selector)).toHaveAttribute("inert");
    }
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector("main")).not.toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("auto");
  });

  it("wraps forward and backward Tab navigation within the dialog", () => {
    const { dialog } = openMore();
    const first = within(dialog).getByRole("button", { name: "Close more navigation" });
    const last = within(dialog).getByRole("button", { name: "Log out" });
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(first).toHaveFocus();
  });

  it("returns focus after explicit close and backdrop dismissal", () => {
    const { trigger, dialog } = openMore();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close more navigation" }));
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
