// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { modules } from "@/modules/navigation/navigation";
import { WorkspaceGuide } from "@/shared/components/workspace-guide";

describe("workspace task discovery", () => {
  it("finds supporting documents while limiting results to the provided employee navigation", () => {
    render(<WorkspaceGuide navigation={[modules.dashboard, modules.schedule, modules.profile]} role="EMPLOYEE" />);
    const trigger = screen.getByRole("button", { name: "Find a feature" });
    fireEvent.click(trigger);
    const search = screen.getByRole("searchbox", { name: "Search workspace features" });
    fireEvent.change(search, { target: { value: "CV" } });
    expect(screen.getByRole("link", { name: /My profile/ })).toHaveAttribute("href", "/profile");
    expect(screen.queryByRole("link", { name: /Work map|Accounts|Activity log/ })).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "account administration" } });
    expect(screen.getByRole("heading", { name: "No matching feature" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show all features" }));
    expect(search).toHaveValue("");
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("closes the native task dialog and restores scroll when a feature is chosen", () => {
    render(<WorkspaceGuide navigation={[modules.schedule]} role="ADMIN" />);
    fireEvent.click(screen.getByRole("button", { name: "Find a feature" }));
    expect(screen.getByRole("link")).toHaveTextContent("View schedules within your access");
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("link"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
