// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardCards, ReportIndex, ReportTable, ReportView } from "@/modules/reporting/forms";
import type { DashboardView, ReportView as ReportViewType } from "@/modules/reporting/service";

const dashboard: DashboardView = {
  role: "SUPER_ADMIN", asOf: "16 Sep 2026, 10:00",
  cards: [
    { key: "active-employees", label: "Active employees", question: "How many people are on the books?", value: "18", href: "/employees" },
    { key: "expired-certifications", label: "Expired certifications", question: "Which certifications have lapsed?", value: "2", href: "/reports/certification-status" },
  ],
  sections: [{ key: "employees-by-team", label: "Employees by team", columns: [{ key: "team", label: "Team" }, { key: "count", label: "Employees" }], rows: [{ team: "team:alpha", count: "9" }] }],
  notes: ["Every card reads a named source."],
};

const reportColumns = [
  { key: "data_state", label: "Data state" },
  { key: "assignment_date", label: "Assignment date" },
  { key: "scheduled_hours", label: "Scheduled hours" },
  { key: "employee_name", label: "Employee" },
];

const report: ReportViewType = {
  key: "published-allocation", label: "Published allocation", question: "Who is assigned?",
  asOf: "16 Sep 2026, 10:00", windowLabel: "2027-09-01 to 2027-09-30",
  windowFrom: "2027-09-01", windowTo: "2027-09-30", conflictDate: "2027-09-15",
  columns: reportColumns,
  rows: [{ data_state: "PUBLISHED", assignment_date: "2027-09-14", scheduled_hours: "4.00", employee_name: "Cora Bell" }],
  page: 1, pageSize: 100, totalRows: 1, hasNext: false, hasPrevious: false,
  planning: false, exportable: true, emptyState: "No published assignment falls inside this window.", notes: ["Published assignments only."], unavailable: false,
};

const planningReport: ReportViewType = { ...report, key: "planning-unpublished", label: "Planning (unpublished)", planning: true, exportable: false, rows: [{ data_state: "PLANNING (unpublished)", assignment_date: "2027-12-07", scheduled_hours: "2.00", employee_name: "Cora Bell" }] };

describe("Phase 11 dashboard", () => {
  it("renders cards, the as-of timestamp, the section table and the notes", () => {
    render(<DashboardCards view={dashboard} />);
    expect(screen.getByRole("heading", { name: "Dashboard", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/As of 16 Sep 2026, 10:00 \(Asia\/Dubai\)/)).toBeInTheDocument();
    expect(screen.getByText("Active employees")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    const employeeCard = screen.getByText("Active employees").closest("li")!;
    expect(within(employeeCard).getByRole("link", { name: "Open" })).toHaveAttribute("href", "/employees");
    const section = screen.getByRole("region", { name: "Employees by team" });
    expect(within(section).getByText("team:alpha")).toBeInTheDocument();
  });

  it("distinguishes a legitimate zero from a missing required source", () => {
    render(<DashboardCards view={{ ...dashboard, cards: [{ key: "x", label: "Pending leave requests", question: "Any?", value: "0" }, { key: "y", label: "Leave balance", question: "Any?", value: "—", unavailable: true }] }} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Unavailable: a required reporting source");
  });

  it("never presents a general staffing-availability claim", () => {
    const { container } = render(<DashboardCards view={dashboard} />);
    const text = container.textContent?.toLowerCase() ?? "";
    for (const term of ["capacity", "utilization", "worked hours", "attendance", "performance", "productive", "qualified", "compliant", "eligible"]) {
      expect(text, `prohibited term present: ${term}`).not.toContain(term);
    }
    expect(text).not.toContain("available for");
  });
});

describe("Phase 11 report index", () => {
  it("lists only the entries it is given and flags the planning report", () => {
    render(<ReportIndex
      entries={[
        { key: "published-allocation", label: "Published allocation", question: "Who is assigned?", grain: "one row per Published assignment", privacy: "operational", planning: false, exportable: true },
        { key: "planning-unpublished", label: "PLANNING (UNPUBLISHED)", question: "What is planned?", grain: "one row per unpublished assignment", privacy: "operational", planning: true, exportable: false },
      ]}
      options={{ clientOptions: [{ id: "c1", name: "Alpha Facilities" }], projectOptions: [], locationOptions: [] }}
    />);
    const publishedEntry = screen.getByText("Published allocation").closest("li")!;
    expect(within(publishedEntry).getByRole("link", { name: "Open report" })).toHaveAttribute("href", "/reports/published-allocation");
    expect(screen.getByText("PLANNING (unpublished)")).toBeInTheDocument();
    expect(screen.getByText("Client · Alpha Facilities")).toBeInTheDocument();
  });

  it("renders an empty state rather than an empty list when no report is available", () => {
    render(<ReportIndex entries={[]} options={{ clientOptions: [], projectOptions: [], locationOptions: [] }} />);
    expect(screen.getByText(/No report is available for your current role/)).toBeInTheDocument();
  });
});

describe("Phase 11 report view", () => {
  it("renders the projection, the as-of stamp, the window and an export link for an exportable report", () => {
    render(<ReportView view={report} filters={{ clientOptions: [], projectOptions: [], locationOptions: [] }} />);
    expect(screen.getByRole("heading", { name: "Published allocation", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Window 2027-09-01 to 2027-09-30/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download CSV" })).toHaveAttribute("href", expect.stringContaining("/api/reports/published-allocation/export"));
    const table = screen.getByRole("region", { name: "Published allocation rows" });
    expect(within(table).getByText("Cora Bell")).toBeInTheDocument();
    expect(screen.queryByText(/PLANNING \(unpublished\)/)).not.toBeInTheDocument();
  });

  it("labels the planning report everywhere and hides the export control", () => {
    render(<ReportView view={planningReport} filters={{ clientOptions: [], projectOptions: [], locationOptions: [] }} />);
    expect(screen.getByRole("heading", { name: "PLANNING (UNPUBLISHED)", level: 1 })).toBeInTheDocument();
    expect(document.querySelector(".reporting-planning-banner")).toHaveTextContent("PLANNING (unpublished)");
    expect(screen.queryByRole("link", { name: "Download CSV" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Planning (unpublished) rows" })).toHaveTextContent("PLANNING (unpublished)");
  });

  it("shows the approved empty state when a report legitimately has no rows", () => {
    render(<ReportView view={{ ...report, rows: [], totalRows: 0 }} filters={{ clientOptions: [], projectOptions: [], locationOptions: [] }} />);
    expect(screen.getByText("No row matches this view.")).toBeInTheDocument();
  });

  it("renders the accessible table equivalent for the same data", () => {
    render(<ReportTable columns={reportColumns} rows={report.rows} caption="Published allocation rows" />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(4);
    expect(within(table).getByText("4.00")).toBeInTheDocument();
  });
});
