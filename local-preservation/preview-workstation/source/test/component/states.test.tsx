// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyModule, SafeState } from "@/shared/components/states";
describe("Phase 1–2 visual states", () => {
  it("clearly identifies an intentionally empty later-phase module without fake actions", () => { render(<EmptyModule title="Schedule" purpose="Planning is later." phase={4} />); expect(screen.getByText("Planned for Phase 4")).toBeInTheDocument(); expect(screen.getByText("No business actions are available here.")).toBeInTheDocument(); expect(screen.getByText(/does not simulate persistence or success/i)).toBeInTheDocument(); });
  it("renders a safe recovery action", () => { render(<SafeState title="Unauthorized" message="No access." />); expect(screen.getByRole("link", { name: "Return to a safe page" })).toBeInTheDocument(); });
});
