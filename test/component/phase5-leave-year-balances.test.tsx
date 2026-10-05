// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ actor: vi.fn(), mine: vi.fn(), review: vi.fn() }));
vi.mock("@/modules/auth/session-service", () => ({ getCurrentActor: mocks.actor }));
vi.mock("@/modules/leave/forms", () => ({ AllowanceForm: () => null, CancelLeaveForm: () => null, LeaveDecisionForm: () => null, LeaveRequestForm: () => null }));
vi.mock("@/modules/leave/service", () => ({ LEAVE_TIMEZONE: "Asia/Dubai", leaveService: { getMyLeave: mocks.mine, getReview: mocks.review, reviewQueue: async () => [], getAllowance: async () => ({ annualWorkingDays: 22, version: 1 }) } }));
import LeavePage from "@/app/(protected)/leave/page";

describe("Leave request calendar-year balances", () => {
  it("shows approved request remaining balance without suggesting a second deduction", async () => {
    mocks.actor.mockResolvedValue({ role: "EMPLOYEE" });
    mocks.mine.mockResolvedValue({ balance: { year: 2026, allowance: 22, used: 0, remaining: 22 }, requests: [{ id: "approved", startDate: "2030-01-01", endDate: "2030-01-28", status: "APPROVED", requestedWorkingDays: 20, balances: [{ year: 2030, requestedWorkingDays: 20, projectedRemaining: 2 }] }] });
    render(await LeavePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("2030: 20 requested working days · Remaining: 2")).toBeInTheDocument();
    expect(screen.queryByText(/Projected remaining if approved/)).not.toBeInTheDocument();
  });

  it("shows both annual balances when Super Admin reviews a cross-year request", async () => {
    mocks.actor.mockResolvedValue({ role: "SUPER_ADMIN" });
    mocks.review.mockResolvedValue({ request: { id: "pending", employeeUserId: "fictional-employee", startDate: "2040-12-31", endDate: "2041-01-25", status: "PENDING", version: 1 }, requestedWorkingDays: 20, publishedImpact: [], balances: [{ year: 2040, allowance: 22, used: 20, remaining: 2, requestedWorkingDays: 1, projectedRemaining: 1 }, { year: 2041, allowance: 22, used: 0, remaining: 22, requestedWorkingDays: 19, projectedRemaining: 3 }] });
    render(await LeavePage({ searchParams: Promise.resolve({ request: "pending" }) }));
    expect(screen.getByRole("heading", { name: "Calendar year 2040" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Calendar year 2041" })).toBeInTheDocument();
    expect(screen.getByText("1 requested working days · Projected remaining if approved: 1")).toBeInTheDocument();
    expect(screen.getByText("19 requested working days · Projected remaining if approved: 3")).toBeInTheDocument();
  });
});
