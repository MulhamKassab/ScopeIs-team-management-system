// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardCards, ReportIndex, ReportTable, ReportView } from "@/modules/reporting/forms";
import type { DashboardView, ReportView as ReportViewType } from "@/modules/reporting/service";

const dashboard: DashboardView = {
  role: "SUPER_ADMIN", asOf: "16 Sep 2026, 10:00",
  cards: [
    { key: "active-employees", label: "Active employees", question: "How many people are on the books?", value: "18", href: "/employees" },
    { key: "expired-certifications", label: "Expired certifications", question: "Which certifications have lapsed?", value: "2", href: "/reports/certification-status" },
  ],
  sections: [{ key: "employees-by-team", label: "Employees by team", question: "How is the workforce distributed across teams?", columns: [{ key: "team", label: "Team" }, { key: "count", label: "Employees" }], rows: [{ team: "team:alpha", count: "9" }], emptyState: "No active employee is recorded yet.", href: "/employees" }],
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
  query: { from: "2027-09-01", to: "2027-09-30" },
  columns: reportColumns,
  rows: [{ data_state: "PUBLISHED", assignment_date: "2027-09-14", scheduled_hours: "4.00", employee_name: "Cora Bell" }],
  page: 1, pageSize: 100, totalRows: 1, hasNext: false, hasPrevious: false,
  planning: false, exportable: true, emptyState: "No published assignment falls inside this window.", notes: ["Published assignments only."], unavailable: false,
};

const planningReport: ReportViewType = { ...report, key: "planning-unpublished", label: "Planning (unpublished)", planning: true, exportable: false, rows: [{ data_state: "PLANNING (unpublished)", assignment_date: "2027-12-07", scheduled_hours: "2.00", employee_name: "Cora Bell" }] };

describe("Phase 11 dashboard", () => {
  it("renders cards, the as-of timestamp, the section table and the notes", () => {
    render(<DashboardCards view={dashboard} />);
    fireEvent.click(screen.getByText("More team insights"));
    expect(screen.getByRole("heading", { name: "Home", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/As of 16 Sep 2026, 10:00 \(Asia\/Dubai\)/)).toBeInTheDocument();
    expect(screen.getByText("Active people")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    const employeeCard = screen.getByText("Active people").closest("li")!;
    expect(within(employeeCard).getByRole("link", { name: "View people: Active people" })).toHaveAttribute("href", "/employees");
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
    fireEvent.click(screen.getByText("More team insights"));
    const text = container.textContent?.toLowerCase() ?? "";
    for (const term of ["capacity", "utilization", "worked hours", "attendance", "performance", "productive", "qualified", "compliant", "eligible"]) {
      expect(text, `prohibited term present: ${term}`).not.toContain(term);
    }
    expect(text).not.toContain("available for");
  });
});

/** The approved contracts count a table as an information surface, so both cards and sections are asserted. */
const superAdminSurfaces: DashboardView = {
  ...dashboard,
  cards: [
    "Active employees", "Current Published client-months", "Published assignments this month",
    "Employees with no Published assignment this month", "Pending leave requests", "Approved leave days this month",
    "Pending replacement requests", "Evidence awaiting review", "Expired certifications",
  ].map((label, index) => ({ key: `card-${index}`, label, question: `${label}?`, value: String(index) })),
  sections: [
    { key: "employees-by-team", label: "Employees by team", question: "Distribution?", columns: [{ key: "team", label: "Team" }, { key: "count", label: "Employees" }], rows: [{ team: "team:alpha", count: "9" }], emptyState: "No active employee is recorded yet.", href: "/employees" },
    { key: "schedule-lifecycle", label: "Schedule lifecycle", question: "Where does each client-month sit?", columns: [{ key: "effective_state", label: "Effective state" }, { key: "client_months", label: "Client-months" }], rows: [{ effective_state: "PUBLISHED", client_months: "2" }], emptyState: "No schedule period exists yet.", href: "/reports/schedule-lifecycle" },
    { key: "recent-actions", label: "Recent recorded actions", question: "What happened most recently?", columns: [{ key: "occurred_at", label: "Occurred at" }, { key: "action", label: "Action" }], rows: [{ occurred_at: "16/09/2026, 10:00", action: "Report export generated" }], emptyState: "No recorded action matches the current history.", href: "/audit" },
  ],
};

const employeeSurfaces: DashboardView = {
  role: "EMPLOYEE", asOf: "16 Sep 2026, 10:00",
  cards: [
    { key: "my-leave", label: "My leave and balance", question: "How much annual leave do I have left?", value: "12", detail: "10 of 22 working days used in 2027", href: "/leave" },
    { key: "my-skills", label: "My recorded skills", question: "How many skills are on my profile?", value: "3", href: "/skills" },
    { key: "my-evidence", label: "My capability evidence", question: "What evidence have I recorded?", value: "2", detail: "1 expired", href: "/profile" },
    { key: "my-unread", label: "My unread notifications", question: "Do I have anything new?", value: "1", href: "/notifications" },
  ],
  sections: [
    { key: "my-upcoming", label: "My published assignments (next 7 days)", question: "What am I scheduled for this week?", columns: [{ key: "assignment_date", label: "Date" }, { key: "time", label: "Time" }], rows: [{ assignment_date: "2027-09-14", time: "08:00–12:00" }], emptyState: "You have no current Published assignment in the next seven days.", href: "/schedule" },
    { key: "my-leave-requests", label: "My leave", question: "What leave have I requested?", columns: [{ key: "start_date", label: "Start date" }, { key: "status", label: "Status" }], rows: [{ start_date: "2027-09-15", status: "APPROVED" }], emptyState: "You have no leave request recorded.", href: "/leave" },
  ],
  notes: ["Your dashboard reads only the current Published schedule and your own records."],
};

describe("Phase 11 dashboard acceptance reconciliation", () => {
  it("renders all twelve approved Super Admin information surfaces as independently named, accessible sections", () => {
    render(<DashboardCards view={superAdminSurfaces} />);
    fireEvent.click(screen.getByText("More team insights"));
    for (const label of [
      "Active employees", "Current Published client-months", "Published assignments this month",
      "Employees with no Published assignment this month", "Pending leave requests", "Approved leave days this month",
      "Pending replacement requests", "Evidence awaiting review", "Expired certifications",
      "Employees by team", "Schedule lifecycle", "Recent recorded actions",
    ]) {
      expect(screen.getAllByText(label).length, label).toBeGreaterThan(0);
    }
    // Twelve surfaces in total: nine cards plus three tables, each with its own accessible region.
    expect(document.querySelectorAll(".reporting-cards li").length).toBe(9);
    for (const caption of ["Employees by team", "Schedule lifecycle", "Recent recorded actions"]) {
      expect(screen.getByRole("region", { name: caption })).toBeInTheDocument();
    }
    // Each table surface carries its own drill-down, reauthorized by the destination route.
    expect(screen.getByRole("link", { name: "View team" })).toHaveAttribute("href", "/employees");
    expect(screen.getByRole("link", { name: "View schedule status" })).toHaveAttribute("href", "/reports/schedule-lifecycle");
    expect(screen.getByRole("link", { name: "View audit history" })).toHaveAttribute("href", "/audit");
    expect(screen.getAllByText(/As of 16 Sep 2026, 10:00 \(Asia\/Dubai\)/).length).toBe(1);
  });

  it("renders all five approved Employee information areas and no management surface", () => {
    render(<DashboardCards view={employeeSurfaces} />);
    fireEvent.click(screen.getByText("More about your work"));
    for (const label of ["My published assignments (next 7 days)", "My leave and balance", "My leave", "My recorded skills", "My documents", "My unread notifications"]) {
      expect(screen.getAllByText(label).length, label).toBeGreaterThan(0);
    }
    expect(screen.getByRole("link", { name: "View my skills: My recorded skills" })).toHaveAttribute("href", "/skills");
    for (const forbidden of ["Active employees", "Team", "Evidence awaiting review", "Audit", "Reports"]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument();
    }
  });

  it("keeps each section's empty behaviour explicit and distinct from a missing source", () => {
    render(<DashboardCards view={{ ...superAdminSurfaces, sections: superAdminSurfaces.sections.map((section) => ({ ...section, rows: [] })) }} />);
    expect(screen.getByText("No active employee is recorded yet.")).toBeInTheDocument();
    expect(screen.getByText("No schedule period exists yet.")).toBeInTheDocument();
    expect(screen.getByText("No recorded action matches the current history.")).toBeInTheDocument();
    // A legitimate zero is not a missing source, so no unavailable alert is raised.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the terminology rule on the reconciled surfaces", () => {
    const { container } = render(<DashboardCards view={superAdminSurfaces} />);
    fireEvent.click(screen.getByText("More team insights"));
    const text = container.textContent?.toLowerCase() ?? "";
    for (const term of ["capacity", "utilization", "worked hours", "attendance", "performance", "productive", "qualified", "compliant", "eligible", "availability", "available"]) {
      expect(text, `prohibited term present: ${term}`).not.toContain(term);
    }
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
    const publishedEntry = screen.getByText("Who is working where").closest("li")!;
    expect(within(publishedEntry).getByRole("link", { name: "Who is working where" })).toHaveAttribute("href", "/reports/published-allocation");
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
    expect(screen.getByRole("heading", { name: "Who is working where", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Window 2027-09-01 to 2027-09-30/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download CSV" })).toHaveAttribute("href", expect.stringContaining("/api/reports/published-allocation/export"));
    const table = screen.getByRole("region", { name: "Published allocation rows" });
    expect(within(table).getByText("Cora Bell")).toBeInTheDocument();
    expect(screen.queryByText(/PLANNING \(unpublished\)/)).not.toBeInTheDocument();
  });

  it("labels the planning report everywhere and hides the export control", () => {
    render(<ReportView view={planningReport} filters={{ clientOptions: [], projectOptions: [], locationOptions: [] }} />);
    expect(screen.getByRole("heading", { name: "Unpublished plans", level: 1 })).toBeInTheDocument();
    expect(document.querySelector(".reporting-planning-banner")).toHaveTextContent("PLANNING (unpublished)");
    expect(screen.queryByRole("link", { name: "Download CSV" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Planning (unpublished) rows" })).toHaveTextContent("PLANNING (unpublished)");
  });

  it("shows the approved empty state when a report legitimately has no rows", () => {
    render(<ReportView view={{ ...report, rows: [], totalRows: 0 }} filters={{ clientOptions: [], projectOptions: [], locationOptions: [] }} />);
    // The contract's own empty state is rendered, so zero is explained rather than implied.
    expect(screen.getByText("No published assignment falls inside this window.")).toBeInTheDocument();
  });

  it("renders the accessible table equivalent for the same data", () => {
    render(<ReportTable columns={reportColumns} rows={report.rows} caption="Published allocation rows" />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(4);
    expect(within(table).getByText("4.00")).toBeInTheDocument();
  });
});


describe("report filter continuity", () => {
  const options = { clientOptions: [{ id: "client-1", name: "Chosen client" }], projectOptions: [], locationOptions: [] };
  it("preserves dimensions and dates in pagination, exports and selected controls", () => {
    const query = { from: "2027-09-01", to: "2027-09-30", clientId: "client-1" };
    render(<ReportView view={{ ...report, page: 2, hasPrevious: true, hasNext: true, query }} filters={options} />);
    expect(screen.getByLabelText("Client")).toHaveValue("client-1");
    expect(screen.queryByLabelText("Window start time")).not.toBeInTheDocument();
    for (const name of ["Previous", "Next", "Download CSV"]) {
      const url = new URL(screen.getByRole("link", { name }).getAttribute("href")!, "http://localhost");
      for (const [key, value] of Object.entries(query)) expect(url.searchParams.get(key)).toBe(value);
      expect(url.searchParams.get("page")).toBe(name === "Previous" ? "1" : name === "Next" ? "3" : null);
    }
  });

  it("preserves conflict date and times in leave exports and pagination", () => {
    const query = { from: "2027-09-01", to: "2027-09-30", date: "2027-09-14", start: "09:00", end: "11:00" };
    render(<ReportView view={{ ...report, key: "approved-leave", query, conflictDate: query.date, hasNext: true }} filters={options} />);
    expect(screen.getByLabelText("Window start time")).toHaveValue("09:00");
    expect(screen.getByLabelText("Window end time", { exact: false })).toHaveValue("11:00");
    expect(screen.queryByLabelText("Client")).not.toBeInTheDocument();
    for (const name of ["Next", "Download CSV"]) {
      const url = new URL(screen.getByRole("link", { name }).getAttribute("href")!, "http://localhost");
      for (const [key, value] of Object.entries(query)) expect(url.searchParams.get(key)).toBe(value);
    }
  });

  it.each(["leave-balance", "certification-status", "skills-coverage", "skill-gaps", "evidence-review-queue"] as const)("offers no unsupported filters on %s", (key) => {
    render(<ReportView view={{ ...report, key, query: {} }} filters={options} />);
    expect(screen.queryByRole("button", { name: "Apply filters" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download CSV" })).toHaveAttribute("href", `/api/reports/${key}/export?`);
  });
});


describe("task-focused reporting presentation", () => {
  it("puts existing Super Admin decision queues first with meaningful destinations", () => {
    const cards = [
      { key: "active-employees", label: "Active employees", question: "How many?", value: "18", href: "/employees" },
      { key: "awaiting-review", label: "Evidence awaiting review", question: "What needs review?", value: "3", href: "/reports/evidence-review-queue" },
      { key: "pending-leave", label: "Pending leave requests", question: "What needs review?", value: "2", href: "/leave" },
      { key: "pending-replacements", label: "Pending replacement requests", question: "What needs review?", value: "1", href: "/replacements" },
    ];
    render(<DashboardCards view={{ ...dashboard, cards }} />);
    const queues = screen.getByRole("region", { name: "Ready for review" });
    expect(within(queues).getAllByRole("listitem").map((item) => item.getAttribute("data-metric")))
      .toEqual(["pending-leave", "pending-replacements", "awaiting-review"]);
    expect(within(queues).getByRole("link", { name: "Review leave: Pending leave requests" })).toHaveAttribute("href", "/leave");
    expect(within(queues).getByRole("link", { name: "Review documents: Documents to review" })).toHaveAttribute("href", "/reports/evidence-review-queue");
    expect(queues.compareDocumentPosition(screen.getByRole("region", { name: "Published plan and team" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open", exact: true })).not.toBeInTheDocument();
  });

  it("keeps scoped Admin leave copy observational and never presents a review action", () => {
    render(<DashboardCards view={{ ...dashboard, role: "ADMIN", cards: [
      { key: "pending-leave", label: "Pending leave requests", question: "Any requests?", value: "2", href: "/leave" },
      { key: "my-replacements", label: "Replacement requests I raised", question: "What did I request?", value: "1", href: "/replacements" },
    ], sections: [] }} />);
    const requests = screen.getByRole("region", { name: "Requests to follow" });
    expect(within(requests).getByRole("link", { name: "View leave: Pending leave requests" })).toHaveAttribute("href", "/leave");
    expect(screen.queryByRole("link", { name: /Review leave/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Ready for review" })).not.toBeInTheDocument();
  });

  it("puts an Employee's own upcoming schedule before profile counts", () => {
    render(<DashboardCards view={employeeSurfaces} />);
    fireEvent.click(screen.getByText("More about your work"));
    const schedule = screen.getByRole("region", { name: "My published assignments (next 7 days)" });
    const profile = screen.getByRole("region", { name: "Your profile" });
    expect(schedule.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open my schedule" })).toHaveAttribute("href", "/schedule");
    expect(screen.queryByText("Phase 11 operational summary")).not.toBeInTheDocument();
  });

  it("groups only authorized reports by a practical question and keeps row detail in a disclosure", () => {
    render(<ReportIndex entries={[
      { key: "published-allocation", label: "Published allocation", question: "Who is assigned?", grain: "one row per Published assignment", privacy: "operational", planning: false, exportable: true },
      { key: "certification-status", label: "Certification status", question: "Which certifications are recorded?", grain: "one row per certification", privacy: "operational", planning: false, exportable: false },
    ]} options={{ clientOptions: [], projectOptions: [], locationOptions: [] }} />);
    expect(within(screen.getByRole("region", { name: "Understand the staffing plan" })).getByRole("link", { name: "Who is working where" })).toHaveAttribute("href", "/reports/published-allocation");
    expect(within(screen.getByRole("region", { name: "Review skills and evidence" })).getByRole("link", { name: "Certification status" })).toHaveAttribute("href", "/reports/certification-status");
    expect(screen.queryByRole("region", { name: "Plan around leave and coverage" })).not.toBeInTheDocument();
    expect(screen.getByText("one row per Published assignment").closest("details")).not.toHaveAttribute("open");
    expect(screen.queryByText(/Grain:/)).not.toBeInTheDocument();
  });

  it("separates date and scope filters and keeps explanatory notes out of the primary results", () => {
    render(<ReportView view={report} filters={{ clientOptions: [], projectOptions: [], locationOptions: [] }} />);
    expect(within(screen.getByRole("group", { name: "Date range" })).getByLabelText("From date")).toHaveValue(report.windowFrom);
    expect(within(screen.getByRole("group", { name: "Client, project or location" })).getByRole("combobox", { name: "Client" })).toBeInTheDocument();
    expect(screen.getByText("Published assignments only.").closest("details")).not.toHaveAttribute("open");
    expect(screen.getByRole("link", { name: "All reports" })).toHaveAttribute("href", "/reports");
  });
});
