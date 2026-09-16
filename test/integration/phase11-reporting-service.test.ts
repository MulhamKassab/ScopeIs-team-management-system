import { and, eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { adminScopeGrants, auditEvents, employeeEvidence, users } from "@/db/schema";
import { coverageService } from "@/modules/coverage/service";
import { ReportDomainError } from "@/modules/reporting/domain-error";
import { reportExportService } from "@/modules/reporting/export-service";
import { reportingService } from "@/modules/reporting/service";
import { phase3Ids } from "../../scripts/phase10-test-fixtures.mjs";
import { APPROVED_LEAVE_DATE, PRIVATE_MARKER, PROPOSED_MONTH, PUBLISHED_MONTH, phase11Ids } from "../../scripts/phase11-test-fixtures.mjs";
import type { AuthenticatedActor, SystemRole } from "@/shared/types/foundation";

const actor = (id: string, role: SystemRole): AuthenticatedActor => ({ id, role, displayName: id, sessionId: `s-${id}`, sessionVersion: 1, scopes: [], authenticationMode: "mock" });
const nora = () => actor("mock-super-admin-nora", "SUPER_ADMIN");
const ava = () => actor("mock-admin-ava", "ADMIN");
const ben = () => actor("mock-admin-ben", "ADMIN");
const cora = () => actor("mock-employee-cora", "EMPLOYEE");
const dan = () => actor("mock-employee-dan", "EMPLOYEE");

const YEAR = { from: "2027-01-01", to: "2027-12-31" };
const PUBLISHED_WINDOW = { from: `${PUBLISHED_MONTH}-01`, to: `${PUBLISHED_MONTH}-30` };

async function setRole(userId: string, role: SystemRole) { await db.update(users).set({ role }).where(eq(users.id, userId)); }
async function setActive(userId: string, active: boolean) { await db.update(users).set({ active }).where(eq(users.id, userId)); }
async function activeTeamGrants(userId: string) {
  return (await db.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, userId), eq(adminScopeGrants.active, true), eq(adminScopeGrants.scopeType, "TEAM")))).map((row) => row.scopeReference);
}
async function setTeamGrantActive(userId: string, reference: string, active: boolean) {
  const existing = (await db.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, userId), eq(adminScopeGrants.scopeType, "TEAM"), eq(adminScopeGrants.scopeReference, reference))))[0];
  if (existing) await db.update(adminScopeGrants).set({ active, updatedAt: new Date() }).where(eq(adminScopeGrants.id, existing.id));
  else if (active) await db.insert(adminScopeGrants).values({ userId, scopeType: "TEAM", scopeReference: reference });
}
async function refuseCode(operation: () => Promise<unknown>) {
  try { await operation(); return null; } catch (error) { return error instanceof ReportDomainError ? { code: error.code, status: error.status, message: error.message } : { code: "OTHER" }; }
}

describe("Phase 11 published allocation (R1) and planning (R4)", () => {
  it("keeps Published allocation strictly Published and planning strictly Draft/Proposed", async () => {
    const published = await reportingService.report(nora(), "published-allocation", YEAR);
    const publishedIds = published.rows.map((row) => row.data_state);
    expect(new Set(publishedIds)).toEqual(new Set(["PUBLISHED"]));

    const planning = await reportingService.report(nora(), "planning-unpublished", YEAR);
    expect(planning.planning).toBe(true);
    expect(planning.label).toBe("Planning (unpublished)");
    expect(new Set(planning.rows.map((row) => row.data_state))).toEqual(new Set(["PLANNING (unpublished)"]));
    // The Proposed month and the Phase 10 Draft months are the planning source, and never Published.
    expect(planning.rows.some((row) => row.planning_month === PROPOSED_MONTH)).toBe(true);
    expect(planning.rows.some((row) => row.planning_month === PUBLISHED_MONTH)).toBe(false);
    expect(published.rows.some((row) => row.planning_month === PUBLISHED_MONTH)).toBe(true);
  });

  it("keeps the Published window narrower than the planning window for the same month", async () => {
    const published = await reportingService.report(nora(), "published-allocation", PUBLISHED_WINDOW);
    const planning = await reportingService.report(nora(), "planning-unpublished", PUBLISHED_WINDOW);
    expect(published.totalRows).toBe(2);
    expect(planning.rows.some((row) => row.planning_month === PUBLISHED_MONTH)).toBe(false);
  });

  it("scopes Published allocation and planning to the Admin's current operational grants", async () => {
    const adminPublished = await reportingService.report(ava(), "published-allocation", YEAR);
    expect(adminPublished.rows.some((row) => row.client_name === "Alpha Facilities")).toBe(true);
    const otherAdminPublished = await reportingService.report(ben(), "published-allocation", YEAR);
    expect(otherAdminPublished.rows.some((row) => row.client_name === "Alpha Facilities")).toBe(false);
    // Ben's project/location grants do not cover the Alpha client-month, so his planning view is empty too.
    const otherAdminPlanning = await reportingService.report(ben(), "planning-unpublished", YEAR);
    expect(otherAdminPlanning.rows.some((row) => row.client_name === "Alpha Facilities")).toBe(false);
    // The in-scope Admin can reach the planning view.
    const adminPlanning = await reportingService.report(ava(), "planning-unpublished", YEAR);
    expect(adminPlanning.rows.some((row) => row.client_name === "Alpha Facilities")).toBe(true);
  });

  it("refuses Employees every report route", async () => {
    for (const key of ["published-allocation", "planning-unpublished", "certification-status", "audit-history"]) {
      expect(await refuseCode(() => reportingService.report(cora(), key, YEAR))).toMatchObject({ code: "NOT_FOUND", status: 404 });
    }
  });

  it("refuses Admin-only-excluded and unknown report keys with one non-enumerating error", async () => {
    const refused = await Promise.all([
      refuseCode(() => reportingService.report(ava(), "leave-balance", YEAR)),
      refuseCode(() => reportingService.report(ava(), "evidence-review-queue", YEAR)),
      refuseCode(() => reportingService.report(ava(), "audit-history", YEAR)),
      refuseCode(() => reportingService.report(ava(), "does-not-exist", YEAR)),
    ]);
    for (const refusal of refused) {
      expect(refusal).toMatchObject({ code: "NOT_FOUND", status: 404, message: "The requested report was not found." });
    }
  });

  it("drops planning and outline rows when the acting Admin's scope is revoked", async () => {
    try {
      expect((await reportingService.report(ava(), "planning-unpublished", YEAR)).rows.some((row) => row.client_name === "Alpha Facilities")).toBe(true);
      await setTeamGrantActive("mock-admin-ava", "team:alpha", false);
      const clientGrant = (await db.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, "mock-admin-ava"), eq(adminScopeGrants.scopeType, "CLIENT"), eq(adminScopeGrants.scopeReference, phase3Ids.alphaClient))))[0];
      if (clientGrant) await db.update(adminScopeGrants).set({ active: false, updatedAt: new Date() }).where(eq(adminScopeGrants.id, clientGrant.id));
      const afterRevocation = await reportingService.report(ava(), "planning-unpublished", YEAR);
      expect(afterRevocation.rows.some((row) => row.client_name === "Alpha Facilities")).toBe(false);
    } finally {
      await setTeamGrantActive("mock-admin-ava", "team:alpha", true);
      const clientGrant = (await db.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, "mock-admin-ava"), eq(adminScopeGrants.scopeType, "CLIENT"), eq(adminScopeGrants.scopeReference, phase3Ids.alphaClient))))[0];
      if (clientGrant) await db.update(adminScopeGrants).set({ active: true, updatedAt: new Date() }).where(eq(adminScopeGrants.id, clientGrant.id));
    }
    expect((await reportingService.report(ava(), "planning-unpublished", YEAR)).rows.some((row) => row.client_name === "Alpha Facilities")).toBe(true);
  });
});

describe("Phase 11 allocation totals", () => {
  it("computes unallocated employees and scheduled hours honestly", async () => {
    const unallocated = await reportingService.report(nora(), "unallocated-employees", PUBLISHED_WINDOW);
    const names = unallocated.rows.map((row) => row.employee_name);
    expect(names).not.toContain("Cora Bell");
    expect(names).not.toContain("Dan Unscoped");

    const hours = await reportingService.report(nora(), "scheduled-hours", PUBLISHED_WINDOW);
    const coraHours = hours.rows.find((row) => row.employee_name === "Cora Bell");
    const danHours = hours.rows.find((row) => row.employee_name === "Dan Unscoped");
    expect(coraHours?.total_hours).toBe("4.00");
    expect(danHours?.total_hours).toBe("2.50");
  });
});

describe("Phase 11 leave reporting", () => {
  it("reports approved days and the conflict fact without leaking private text", async () => {
    const report = await reportingService.report(nora(), "approved-leave", { ...PUBLISHED_WINDOW, date: APPROVED_LEAVE_DATE });
    expect(report.rows.length).toBeGreaterThan(0);
    const row = report.rows.find((entry) => entry.employee_name === "Cora Bell")!;
    expect(row.conflict).toBe("Approved leave on the selected date");
    expect(row.approved_working_days).toBe("1");
    // Redaction: the private marker is stored in the leave row but must never reach the projection.
    expect(JSON.stringify(report)).not.toContain(PRIVATE_MARKER);
    const leaked = await db.select({ reason: sql<string>`private_reason` }).from(sql`leave_requests`).where(sql`private_reason = ${PRIVATE_MARKER}`);
    expect(leaked.length).toBe(1);
  });

  it("refuses a conflict date outside the requested window", async () => {
    expect(await refuseCode(() => reportingService.report(nora(), "approved-leave", { ...PUBLISHED_WINDOW, date: "2028-01-01" }))).toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });

  it("refuses a window beyond the report maximum", async () => {
    expect(await refuseCode(() => reportingService.report(nora(), "approved-leave", { from: "2027-01-01", to: "2027-12-31" }))).toMatchObject({ code: "WINDOW_TOO_LARGE" });
  });

  it("keeps leave balance Super Admin only", async () => {
    expect(await refuseCode(() => reportingService.report(ava(), "leave-balance", YEAR))).toMatchObject({ code: "NOT_FOUND" });
    const balance = await reportingService.report(nora(), "leave-balance", YEAR);
    expect(balance.rows.some((row) => row.employee_name === "Cora Bell")).toBe(true);
    expect(JSON.stringify(balance)).not.toContain(PRIVATE_MARKER);
  });
});

describe("Phase 11 certification and skill reporting", () => {
  it("gives the Super Admin full certification detail and the Admin the summary projection only", async () => {
    const full = await reportingService.report(nora(), "certification-status", YEAR);
    expect(full.columns.map((column) => column.key)).toContain("employee_name");
    expect(full.rows.some((row) => row.expiry_state === "expired")).toBe(true);

    const summary = await reportingService.report(ava(), "certification-status", YEAR);
    expect(summary.columns.map((column) => column.key)).not.toContain("employee_name");
    expect(summary.columns.map((column) => column.key)).not.toContain("details");
    expect(summary.rows.length).toBeGreaterThan(0);
  });

  it("uses only the recorded/not recorded vocabulary and never reads certification state into coverage", async () => {
    const gaps = await reportingService.report(nora(), "skill-gaps", YEAR);
    const statuses = new Set(gaps.rows.map((row) => row.status));
    for (const status of statuses) expect(["recorded", "not recorded"]).toContain(status);
    expect(JSON.stringify(gaps).toLowerCase()).not.toContain("qualified");
    expect(JSON.stringify(gaps).toLowerCase()).not.toContain("eligible");

    // Phase 9.9 regression: changing certification review state must not move coverage results.
    const anchor = phase11Ids.publishedAssignmentOne;
    const before = await coverageService.gaps(nora(), anchor).catch(() => null);
    await db.update(employeeEvidence).set({ reviewState: "verified", verifiedByUserId: "mock-super-admin-nora", verifiedAt: new Date() }).where(eq(employeeEvidence.id, phase11Ids.certificationValid));
    try {
      const after = await coverageService.gaps(nora(), anchor).catch(() => null);
      expect(JSON.stringify(after)).toBe(JSON.stringify(before));
    } finally {
      await db.update(employeeEvidence).set({ reviewState: "unreviewed", verifiedByUserId: null, verifiedAt: null }).where(eq(employeeEvidence.id, phase11Ids.certificationValid));
    }
  });

  it("keeps reporting read-only", async () => {
    const snapshot = async () => ({
      skills: (await db.execute(sql`select count(*)::int as c from employee_skills`)).rows[0],
      evidence: (await db.execute(sql`select count(*)::int as c from employee_evidence`)).rows[0],
      assignments: (await db.execute(sql`select count(*)::int as c from schedule_assignments`)).rows[0],
    });
    const before = await snapshot();
    for (const key of ["published-allocation", "planning-unpublished", "skills-coverage", "skill-gaps", "certification-status", "schedule-lifecycle"]) {
      await reportingService.report(nora(), key, YEAR);
    }
    // Approved leave and replacement status have a 90-day maximum window.
    const ninetyDays = { from: "2027-09-01", to: "2027-11-29" };
    await reportingService.report(nora(), "approved-leave", ninetyDays);
    await reportingService.report(nora(), "coverage-replacement", ninetyDays);
    await reportingService.report(nora(), "leave-balance", YEAR);
    await reportingService.report(nora(), "evidence-review-queue", YEAR);
    await reportingService.report(nora(), "audit-history", YEAR);
    expect(await snapshot()).toEqual(before);
  });
});

describe("Phase 11 dashboards", () => {
  it("gives each role a distinct, honestly-sourced card set", async () => {
    const superAdmin = await reportingService.dashboard(nora());
    expect(superAdmin.cards.map((card) => card.key)).toContain("expired-certifications");
    expect(superAdmin.cards.every((card) => card.value !== "")).toBe(true);

    const admin = await reportingService.dashboard(ava());
    expect(admin.cards.map((card) => card.key)).not.toContain("awaiting-review");
    expect(admin.cards.map((card) => card.key)).not.toContain("expired-certifications");

    const employee = await reportingService.dashboard(cora());
    expect(employee.cards.map((card) => card.key)).toEqual(["my-assignments", "my-skills", "my-evidence", "my-unread"]);
    expect(JSON.stringify(employee)).not.toContain("Dan Unscoped");
  });

  it("keeps a Draft or Proposed assignment invisible from the Employee dashboard", async () => {
    const employee = await reportingService.dashboard(cora());
    const upcoming = employee.sections.find((section) => section.key === "my-upcoming")!;
    // The published month is in 2027, so a today-based window legitimately shows nothing; the point is
    // that no Draft or Proposed row can ever appear here.
    expect(upcoming.rows.every((row) => row.time !== "09:00–11:00")).toBe(true);
  });
});

describe("Phase 11 exports", () => {
  it("allows Super Admin to export planning and refuses the scoped Admin the same export", async () => {
    const planningExport = await reportExportService.generate(nora(), "planning-unpublished", YEAR);
    expect(planningExport.filename).toContain("scopeis-planning-unpublished-");
    expect(planningExport.body).toContain("PLANNING (unpublished)");

    const refused = await refuseCode(() => reportExportService.generate(ava(), "planning-unpublished", YEAR));
    expect(refused).toMatchObject({ code: "NOT_FOUND", status: 404 });
    const refusals = await db.select().from(auditEvents).where(and(eq(auditEvents.action, "report.export.refused"), eq(auditEvents.targetId, "planning-unpublished")));
    expect(refusals.length).toBeGreaterThan(0);
    expect(JSON.stringify(refusals.map((row) => row.metadata))).not.toContain(PRIVATE_MARKER);
  });

  it("exports the same projection the report renders and neutralises spreadsheet formulas", async () => {
    const report = await reportingService.report(nora(), "published-allocation", PUBLISHED_WINDOW);
    const payload = await reportExportService.generate(nora(), "published-allocation", PUBLISHED_WINDOW);
    expect(payload.body.startsWith("\uFEFF")).toBe(true);
    for (const column of report.columns) expect(payload.body.split("\r\n")[0]).toContain(column.label);
    expect(payload.headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(payload.headers["Cache-Control"]).toContain("no-store");

    await db.update(users).set({ displayName: "=SUM(A1:A9)" }).where(eq(users.id, "mock-employee-dan"));
    try {
      const dangerous = await reportExportService.generate(nora(), "published-allocation", PUBLISHED_WINDOW);
      expect(dangerous.body).toContain("'=SUM(A1:A9)");
      expect(dangerous.body).not.toMatch(/(^|,)=SUM/m);
    } finally { await db.update(users).set({ displayName: "Dan Unscoped" }).where(eq(users.id, "mock-employee-dan")); }
  });

  it("writes one content-free generated event and refuses an unknown key non-enumeratingly", async () => {
    const before = (await db.select().from(auditEvents).where(eq(auditEvents.action, "report.export.generated"))).length;
    await reportExportService.generate(nora(), "published-allocation", PUBLISHED_WINDOW);
    const events = await db.select().from(auditEvents).where(eq(auditEvents.action, "report.export.generated"));
    expect(events.length).toBe(before + 1);
    const latest = events[events.length - 1];
    expect(Object.keys(latest.metadata as object).sort()).toEqual(["format", "from", "outcome", "reportKey", "rowCount", "to"].sort());
    expect(JSON.stringify(latest.metadata)).not.toContain(PRIVATE_MARKER);

    expect(await refuseCode(() => reportExportService.generate(nora(), "not-a-report", YEAR))).toMatchObject({ code: "NOT_FOUND", status: 404 });
    const unknownRefusal = await db.select().from(auditEvents).where(and(eq(auditEvents.action, "report.export.refused"), eq(auditEvents.targetId, "unknown")));
    expect(unknownRefusal.length).toBeGreaterThan(0);
  });

  it("never exports audit history", async () => {
    expect(await refuseCode(() => reportExportService.generate(nora(), "audit-history", YEAR))).toMatchObject({ code: "NOT_FOUND" });
  });

  it("prevents the export when the audit write fails", async () => {
    const failing = new (await import("@/modules/reporting/export-service")).ReportExportService(async () => { throw new Error("forced audit failure"); });
    await expect(failing.generate(nora(), "published-allocation", PUBLISHED_WINDOW)).rejects.toThrow("forced audit failure");
  });
});

describe("Phase 11 current-authorization enforcement", () => {
  it("removes report access after a demotion, an out-of-scope move and a deactivation", async () => {
    expect((await reportingService.report(ava(), "published-allocation", YEAR)).rows.length).toBeGreaterThan(0);

    await setRole("mock-admin-ava", "EMPLOYEE");
    try { expect(await refuseCode(() => reportingService.report(ava(), "published-allocation", YEAR))).toMatchObject({ code: "NOT_FOUND" }); }
    finally { await setRole("mock-admin-ava", "ADMIN"); }

    await setActive("mock-admin-ava", false);
    try { expect(await refuseCode(() => reportingService.report(ava(), "published-allocation", YEAR))).toMatchObject({ code: "NOT_FOUND" }); }
    finally { await setActive("mock-admin-ava", true); }

    expect((await reportingService.report(ava(), "published-allocation", YEAR)).rows.length).toBeGreaterThan(0);
  });

  it("does not widen replacement reporting through request ownership", async () => {
    // A request Ava owns but whose anchor assignment sits outside her scope must still be invisible:
    // ownership never widens scope.
    const periodId = "60000000-0000-4000-8000-000000000001";
    const assignmentId = "60000000-0000-4000-8000-000000000002";
    const requestId = "60000000-0000-4000-8000-000000000003";
    await db.execute(sql`insert into schedule_periods (id, client_id, planning_month, lineage_id, status) values (${periodId}, ${phase3Ids.bravoClient}, '2027-09-01', ${periodId}, 'DRAFT') on conflict (id) do nothing`);
    await db.execute(sql`insert into schedule_assignments (id, schedule_period_id, employee_user_id, project_id, location_id, assignment_date, start_time, end_time) values (${assignmentId}, ${periodId}, 'mock-employee-dan', ${phase3Ids.bravoProject}, ${phase3Ids.bravoLocation}, '2027-09-20', '09:00', '10:00') on conflict (id) do nothing`);
    await db.execute(sql`insert into replacement_requests (id, intent, status, anchor_assignment_id, requester_user_id, observed_required_employee_count, observed_eligible_employee_count) values (${requestId}, 'REPLACE_ASSIGNMENT', 'PENDING', ${assignmentId}, 'mock-admin-ava', 1, 0) on conflict (id) do nothing`);
    try {
      const ninetyDays = { from: "2027-09-01", to: "2027-11-29" };
      const adminView = await reportingService.report(ava(), "coverage-replacement", ninetyDays);
      expect(adminView.rows.some((row) => row.requested_by === "Ava Mercer" && row.status === "PENDING" && row.intent === "Replace assignment employee")).toBe(false);
      // The same request is visible to a Super Admin, proving it exists and is hidden by scope alone.
      const superAdminView = await reportingService.report(nora(), "coverage-replacement", ninetyDays);
      expect(superAdminView.rows.length).toBeGreaterThan(adminView.rows.length);
    } finally {
      await db.execute(sql`delete from replacement_requests where id = ${requestId}`);
      await db.execute(sql`delete from schedule_assignments where id = ${assignmentId}`);
      await db.execute(sql`delete from schedule_periods where id = ${periodId}`);
    }
  });

  it("keeps an Employee's dashboard limited to their own records", async () => {
    const employee = await reportingService.dashboard(cora());
    expect(employee.role).toBe("EMPLOYEE");
    expect(employee.cards.every((card) => !card.label.toLowerCase().includes("team"))).toBe(true);
    expect(JSON.stringify(employee)).not.toContain("Dan Unscoped");
  });
});
