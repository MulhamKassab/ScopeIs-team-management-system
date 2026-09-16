import { describe, expect, it } from "vitest";
import { canExportReport, canViewReport, conflictValues, prohibitedReportingTerms, reportKeys, reports, reportDefinition, PLANNING_DATA_STATE } from "@/modules/reporting/definitions";
import { addDays, assertWindow, currentDubaiMonth, formatHours, inclusiveDayCount, minutesBetween, monthBounds, scheduledHours, timesOverlap } from "@/modules/reporting/date-rules";
import { csvBody, csvCell, csvHeader, neutralizeCell, quoteCell, reportFilename, toCsv } from "@/modules/reporting/csv";
import { MAX_EXPORT_ROWS, parseExportFormat, parseMonth, parseReportQuery, skillStatus } from "@/modules/reporting/validation";
import { ReportDomainError } from "@/modules/reporting/domain-error";

describe("Phase 11 reporting CSV safety", () => {
  it("neutralises every spreadsheet formula prefix before quoting", () => {
    for (const prefix of ["=", "+", "-", "@", "\t", "\r"]) {
      expect(neutralizeCell(`${prefix}SUM(A1)`)).toBe(`'${prefix}SUM(A1)`);
      expect(csvCell(`${prefix}SUM(A1)`)).toContain(`'${prefix}`);
    }
    expect(neutralizeCell("Cora Bell")).toBe("Cora Bell");
    expect(neutralizeCell("")).toBe("");
  });

  it("applies RFC 4180 quoting only where the value requires it", () => {
    expect(quoteCell("plain")).toBe("plain");
    expect(quoteCell("with,comma")).toBe('"with,comma"');
    expect(quoteCell('with"quote')).toBe('"with""quote"');
    expect(quoteCell("with\nnewline")).toBe('"with\nnewline"');
    expect(quoteCell(" padded ")).toBe('" padded "');
  });

  it("builds a deterministic header and body from the report projection", () => {
    const columns = [{ key: "a", label: "First" }, { key: "b", label: "Second" }];
    expect(csvHeader(columns)).toBe("First,Second");
    expect(csvBody(columns, [{ a: "1", b: "=2" }])).toBe("1,'=2");
    expect(toCsv(columns, [{ a: "1", b: "2" }])).toBe("\uFEFFFirst,Second\r\n1,2\r\n");
  });

  it("generates a server-side ASCII filename with no user input", () => {
    expect(reportFilename("published-allocation", "2027-01-01", "2027-12-31")).toBe("scopeis-published-allocation-2027-01-01-2027-12-31.csv");
    expect(reportFilename("planning-unpublished", "2027-01-01", "2027-12-31")).toBe("scopeis-planning-unpublished-2027-01-01-2027-12-31.csv");
    expect(reportFilename("../../etc/passwd", "2027-01-01", "2027-12-31")).not.toContain("..");
    expect(reportFilename("A B/C", "2027-01-01", "2027-12-31")).toContain("scopeis-a-b-c-");
  });
});

describe("Phase 11 reporting date rules", () => {
  it("derives inclusive month bounds and day counts", () => {
    expect(monthBounds("2027-02")).toEqual({ from: "2027-02-01", to: "2027-02-28" });
    expect(monthBounds("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(inclusiveDayCount("2027-01-01", "2027-01-01")).toBe(1);
    expect(inclusiveDayCount("2027-01-01", "2027-01-31")).toBe(31);
    expect(currentDubaiMonth(new Date("2027-03-15T00:00:00Z"))).toBe("2027-03");
  });

  it("shifts business dates without local-time drift", () => {
    expect(addDays("2027-01-01", 6)).toBe("2027-01-07");
    expect(addDays("2027-12-31", 1)).toBe("2028-01-01");
  });

  it("computes scheduled hours from wall-clock times only", () => {
    expect(minutesBetween("08:00:00", "12:00:00")).toBe(240);
    expect(scheduledHours("08:00", "12:00")).toBe(4);
    expect(scheduledHours("13:00", "15:30")).toBe(2.5);
    expect(formatHours(2.5)).toBe("2.50");
    expect(timesOverlap({ startTime: "09:00:00", endTime: "11:00:00" }, { start: "10:00", end: "12:00" })).toBe(true);
    expect(timesOverlap({ startTime: "09:00:00", endTime: "10:00:00" }, { start: "10:00", end: "12:00" })).toBe(false);
  });

  it("refuses an over-cap or inverted window rather than truncating", () => {
    expect(assertWindow({ from: "2027-01-01", to: "2027-12-31" }, 366)).toEqual({ from: "2027-01-01", to: "2027-12-31" });
    expect(() => assertWindow({ from: "2027-01-01", to: "2027-12-31" }, 90)).toThrow(ReportDomainError);
    expect(() => assertWindow({ from: "2027-12-31", to: "2027-01-01" }, 366)).toThrow(ReportDomainError);
    expect(() => assertWindow({ from: "not-a-date", to: "2027-01-01" }, 366)).toThrow(ReportDomainError);
  });
});

describe("Phase 11 reporting contracts", () => {
  it("declares a complete contract for every registered report", () => {
    for (const key of reportKeys) {
      const definition = reports[key];
      expect(definition.key).toBe(key);
      expect(definition.label.length).toBeGreaterThan(0);
      expect(definition.question.length).toBeGreaterThan(0);
      expect(definition.source.length).toBeGreaterThan(0);
      expect(definition.grain.length).toBeGreaterThan(0);
      expect(definition.include.length).toBeGreaterThan(0);
      expect(definition.exclude.length).toBeGreaterThan(0);
      expect(definition.ordering.length).toBeGreaterThan(0);
      expect(definition.emptyState.length).toBeGreaterThan(0);
      expect(definition.maxWindowDays).toBeGreaterThan(0);
      expect(definition.viewRoles.length).toBeGreaterThan(0);
    }
    expect(reportDefinition("published-allocation")?.key).toBe("published-allocation");
    expect(reportDefinition("unknown-key")).toBeNull();
  });

  it("grants only the approved role and export matrix", () => {
    // Employees never receive the reports module or any report or export.
    for (const key of reportKeys) {
      expect(canViewReport("EMPLOYEE", key)).toBe(false);
      expect(canExportReport("EMPLOYEE", key)).toBe(false);
    }
    // A scoped Admin reaches the approved set, including the planning view, and not the excluded ones.
    for (const key of ["published-allocation", "unallocated-employees", "scheduled-hours", "planning-unpublished", "approved-leave", "coverage-replacement", "skills-coverage", "skill-gaps", "certification-status", "schedule-lifecycle"] as const) {
      expect(canViewReport("ADMIN", key)).toBe(true);
    }
    for (const key of ["leave-balance", "evidence-review-queue", "audit-history"] as const) {
      expect(canViewReport("ADMIN", key)).toBe(false);
    }
    // Admin exports stay limited to Published allocation and the certification summary projection.
    for (const key of reportKeys) {
      const expected = key === "published-allocation" || key === "certification-status";
      expect(canExportReport("ADMIN", key)).toBe(expected);
    }
    // Planning is view-only for Admin and exportable for Super Admin; audit is never exportable.
    expect(canViewReport("ADMIN", "planning-unpublished")).toBe(true);
    expect(canExportReport("ADMIN", "planning-unpublished")).toBe(false);
    expect(canExportReport("SUPER_ADMIN", "planning-unpublished")).toBe(true);
    expect(canExportReport("SUPER_ADMIN", "audit-history")).toBe(false);
  });

  it("keeps exactly four conflict values and the approved data-state markers", () => {
    expect(conflictValues).toHaveLength(4);
    expect(conflictValues[0]).toBe("No known schedule or approved-leave conflict");
    expect(PLANNING_DATA_STATE).toBe("PLANNING (unpublished)");
    expect([...conflictValues].join(" ").toLowerCase()).not.toContain("available");
  });

  it("lists the prohibited metric vocabulary Phase 11 must never present", () => {
    for (const term of ["capacity", "utilization", "worked hours", "attendance", "performance", "productive", "qualified", "compliant", "eligible"]) {
      expect(prohibitedReportingTerms).toContain(term);
    }
  });
});

describe("Phase 11 reporting validation", () => {
  it("accepts only known query shapes and refuses unknown fields", () => {
    expect(parseReportQuery({ from: "2027-01-01", to: "2027-12-31" })).toMatchObject({ from: "2027-01-01" });
    expect(parseReportQuery({}).page).toBeUndefined();
    expect(() => parseReportQuery({ unexpected: "value" })).toThrow(ReportDomainError);
    expect(() => parseReportQuery({ from: "01-01-2027" })).toThrow(ReportDomainError);
  });

  it("accepts only CSV as an export format", () => {
    expect(parseExportFormat("csv")).toBe("csv");
    expect(parseExportFormat(undefined)).toBe("csv");
    expect(() => parseExportFormat("xlsx")).toThrow(ReportDomainError);
    expect(() => parseExportFormat("pdf")).toThrow(ReportDomainError);
  });

  it("falls back to the current Dubai month and refuses an invalid month", () => {
    expect(parseMonth(undefined, "2027-05")).toBe("2027-05");
    expect(parseMonth("", "2027-05")).toBe("2027-05");
    expect(parseMonth("2027-11", "2027-05")).toBe("2027-11");
    expect(() => parseMonth("2027-13", "2027-05")).toThrow(ReportDomainError);
  });

  it("uses only the two comparison statuses and a 5,000-row cap", () => {
    expect(skillStatus(2, 2)).toBe("recorded");
    expect(skillStatus(3, 2)).toBe("recorded");
    expect(skillStatus(1, 2)).toBe("not recorded");
    expect(MAX_EXPORT_ROWS).toBe(5_000);
  });
});
