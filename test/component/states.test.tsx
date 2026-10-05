// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyModule, SafeState } from "@/shared/components/states";
describe("Phase 1 visual states", () => {
  it("clearly identifies an intentionally empty module", () => { render(<EmptyModule title="Schedule" purpose="Planning is later." phase={4} />); expect(screen.getByText("Coming soon")).toBeInTheDocument(); expect(screen.getByRole("heading", { name: "Schedule" })).toBeInTheDocument(); expect(screen.getByText("Planning is later.")).toBeInTheDocument(); expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/dashboard"); expect(screen.getByText(/This section is planned and has no editable settings yet/)).toBeInTheDocument(); });
  it("renders a safe recovery action", () => { render(<SafeState title="Unauthorized" message="No access." />); expect(screen.getByRole("link", { name: "Return to a safe page" })).toBeInTheDocument(); });
});
