// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationShell } from "@/shared/components/shell";
import { modules } from "@/modules/navigation/navigation";
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
