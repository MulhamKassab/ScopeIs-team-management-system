// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyModule, SafeState } from "@/shared/components/states";
describe("Phase 1 visual states", () => {
  it("clearly identifies an intentionally empty module", () => { render(<EmptyModule title="Schedule" purpose="Planning is later." phase={4} />); expect(screen.getByText("Planned for Phase 4")).toBeInTheDocument(); expect(screen.getByText("Not implemented in Phase 1")).toBeInTheDocument(); });
  it("renders a safe recovery action", () => { render(<SafeState title="Unauthorized" message="No access." />); expect(screen.getByRole("link", { name: "Return to a safe page" })).toBeInTheDocument(); });
});
