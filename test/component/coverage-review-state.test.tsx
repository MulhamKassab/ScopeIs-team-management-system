// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ assignmentContext: vi.fn(), gaps: vi.fn(), candidates: vi.fn() }));
vi.mock("@/modules/auth/session-service", () => ({ getCurrentActor: async () => ({ role: "ADMIN" }) }));
vi.mock("@/modules/coverage/service", () => ({ coverageService: mocks }));
vi.mock("@/modules/coverage/forms", () => ({ ReplacementRequestForm: () => null }));
import CoveragePage from "@/app/(protected)/coverage/page";
import { CoverageDomainError } from "@/modules/coverage/domain-error";

describe("coverage review failure", () => {
  beforeEach(() => { vi.resetAllMocks(); });
  it("never presents an inaccessible assignment as having no gaps", async () => {
    mocks.assignmentContext.mockRejectedValue(new CoverageDomainError("NOT_FOUND"));
    render(await CoveragePage({ searchParams: Promise.resolve({ assignment: "unknown" }) }));
    expect(screen.getByRole("heading", { name: "This assignment is unavailable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open schedule" })).toHaveAttribute("href", "/schedule");
    expect(screen.queryByRole("heading", { name: "No recorded gaps" })).not.toBeInTheDocument();
    expect(mocks.gaps).not.toHaveBeenCalled();
    expect(mocks.candidates).not.toHaveBeenCalled();
  });
  it("reserves the no-gap message for a successful review", async () => {
    mocks.assignmentContext.mockResolvedValue({ id: "authorized", periodId: "period", month: "2027-05", status: "DRAFT", employeeName: "Fictional Employee", clientName: "Fictional Client", projectName: "Fictional Project", locationName: "Fictional Location", assignmentDate: "2027-05-12", startTime: "08:00", endTime: "12:00" });
    mocks.gaps.mockResolvedValue([]);
    mocks.candidates.mockResolvedValue({ candidates: [] });
    render(await CoveragePage({ searchParams: Promise.resolve({ assignment: "authorized" }) }));
    expect(screen.getByRole("heading", { name: "No recorded gaps" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fictional Employee" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "This assignment is unavailable" })).not.toBeInTheDocument();
  });
});
