import pg from "pg";
import { phase3Ids, seedPhase10Journey } from "./phase10-test-fixtures.mjs";

export { phase3Ids, seedPhase10Journey };

/**
 * Phase 11 fictional reporting fixtures.
 *
 * Builds on the Phase 10 set and adds the scheduling states the reporting contracts must separate: one
 * current Published client-month, one Proposed client-month and the Draft periods Phase 10 already
 * creates. The published rows, an approved leave record and certification evidence are all fictional.
 */
export const phase11Ids = {
  publishedPeriod: "50000000-0000-4000-8000-000000000001",
  publishedAssignmentOne: "50000000-0000-4000-8000-000000000002",
  publishedAssignmentTwo: "50000000-0000-4000-8000-000000000003",
  proposedPeriod: "50000000-0000-4000-8000-000000000004",
  proposedAssignment: "50000000-0000-4000-8000-000000000005",
  approvedLeave: "50000000-0000-4000-8000-000000000006",
  certificationValid: "50000000-0000-4000-8000-000000000007",
  certificationExpired: "50000000-0000-4000-8000-000000000008",
};

export const PUBLISHED_MONTH = "2027-09";
export const PROPOSED_MONTH = "2027-12";
export const APPROVED_LEAVE_DATE = "2027-09-15";
/** A distinctive private string used by the redaction tests. It must never appear in any report output. */
export const PRIVATE_MARKER = "FICTIONAL-PRIVATE-MARKER-DO-NOT-REPORT";

export async function seedPhase11Journey(databaseUrl) {
  await seedPhase10Journey(databaseUrl);
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("begin");
    // A current Published client-month with two assignments, so published-only metrics have real rows.
    await client.query(
      "insert into schedule_periods (id, client_id, planning_month, lineage_id, status, is_current, published_at) values ($1,$2,$3,$1,'PUBLISHED',true, now()) on conflict (id) do nothing",
      [phase11Ids.publishedPeriod, phase3Ids.alphaClient, `${PUBLISHED_MONTH}-01`],
    );
    await client.query(
      "insert into schedule_assignments (id, schedule_period_id, employee_user_id, project_id, location_id, assignment_date, start_time, end_time) values ($1,$2,'mock-employee-cora',$3,$4,$5,'08:00','12:00') on conflict (id) do nothing",
      [phase11Ids.publishedAssignmentOne, phase11Ids.publishedPeriod, phase3Ids.alphaProjectOne, phase3Ids.alphaLocation, `${PUBLISHED_MONTH}-14`],
    );
    await client.query(
      "insert into schedule_assignments (id, schedule_period_id, employee_user_id, project_id, location_id, assignment_date, start_time, end_time) values ($1,$2,'mock-employee-dan',$3,$4,$5,'13:00','15:30') on conflict (id) do nothing",
      [phase11Ids.publishedAssignmentTwo, phase11Ids.publishedPeriod, phase3Ids.alphaProjectOne, phase3Ids.alphaLocation, `${PUBLISHED_MONTH}-15`],
    );
    // A Proposed client-month, which must never appear in a Published metric.
    await client.query(
      "insert into schedule_periods (id, client_id, planning_month, lineage_id, status, proposed_at) values ($1,$2,$3,$1,'PROPOSED', now()) on conflict (id) do nothing",
      [phase11Ids.proposedPeriod, phase3Ids.alphaClient, `${PROPOSED_MONTH}-01`],
    );
    await client.query(
      "insert into schedule_assignments (id, schedule_period_id, employee_user_id, project_id, location_id, assignment_date, start_time, end_time) values ($1,$2,'mock-employee-cora',$3,$4,$5,'09:00','11:00') on conflict (id) do nothing",
      [phase11Ids.proposedAssignment, phase11Ids.proposedPeriod, phase3Ids.alphaProjectOne, phase3Ids.alphaLocation, `${PROPOSED_MONTH}-07`],
    );
    // Approved leave for the published month, carrying the private marker in the reason column.
    await client.query(
      "insert into leave_requests (id, employee_user_id, start_date, end_date, status, private_reason, decision_response, reviewed_by_user_id, decided_at) values ($1,'mock-employee-cora',$2,$3,'APPROVED',$4,$5,'mock-super-admin-nora', now()) on conflict (id) do nothing",
      [phase11Ids.approvedLeave, APPROVED_LEAVE_DATE, APPROVED_LEAVE_DATE, PRIVATE_MARKER, PRIVATE_MARKER],
    );
    // Certification evidence in valid and expired states for the certification report.
    await client.query(
      "insert into employee_evidence (id, owner_user_id, uploader_user_id, kind, title, issuer, issue_date, expiry_date, review_state, last_submitted_at) values ($1,'mock-employee-cora','mock-employee-cora','certification','Fictional Reporting Certification','Fictional Institute','2026-01-01','2099-01-01','unreviewed', now()) on conflict (id) do nothing",
      [phase11Ids.certificationValid],
    );
    await client.query(
      "insert into employee_evidence (id, owner_user_id, uploader_user_id, kind, title, issuer, issue_date, expiry_date, review_state, last_submitted_at) values ($1,'mock-employee-cora','mock-employee-cora','certification','Fictional Expired Reporting Certification','Fictional Institute','2020-01-01','2021-01-01','unreviewed', now()) on conflict (id) do nothing",
      [phase11Ids.certificationExpired],
    );
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; } finally { await client.end(); }
}
