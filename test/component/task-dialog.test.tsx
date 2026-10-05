// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TaskDialog } from "@/shared/components/task-dialog";
import { ThemeToggle } from "@/shared/components/theme-provider";

afterEach(() => { cleanup(); document.documentElement.dataset.theme = "light"; });

describe("focused task UI", () => {
  it("keeps forms out of the page until requested and returns to the trigger on cancellation", () => {
    render(<TaskDialog triggerLabel="Add project" title="New project" description="Add a project for this client."><label>Project name<input /></label></TaskDialog>);
    expect(screen.queryByLabelText("Project name")).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: "Add project" });
    trigger.focus(); fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "New project" });
    expect(dialog).toHaveAccessibleDescription("Add a project for this client.");
    expect(screen.getByLabelText("Project name")).toBeVisible();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.queryByLabelText("Project name")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("keeps task feedback visible until the user closes it", () => {
    render(<TaskDialog triggerLabel="Request leave" title="New leave request"><p role="status">Request saved. Waiting for review.</p></TaskDialog>);
    fireEvent.click(screen.getByRole("button", { name: "Request leave" }));
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for review");
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request leave" })).toHaveFocus();
  });

  it("uses the applied theme for the first toggle after a dark-mode reload", () => {
    document.documentElement.dataset.theme = "dark";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
  });

  it("returns to the section heading when saving disables the original trigger", () => {
    const view = (disabled: boolean) => <section><h2>Project locations</h2><TaskDialog triggerLabel="Link location" triggerDisabled={disabled} title="Link a location"><p>Saved</p></TaskDialog></section>;
    const { rerender } = render(view(false));
    fireEvent.click(screen.getByRole("button", { name: "Link location" }));
    rerender(view(true));
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    expect(screen.getByRole("heading", { name: "Project locations" })).toHaveFocus();
  });
});
