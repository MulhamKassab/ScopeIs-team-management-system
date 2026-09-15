import pg from "pg";
import { phase3Ids, phase4Ids, seedPhase4Journey } from "./phase4-test-fixtures.mjs";

export { phase3Ids, phase4Ids, seedPhase4Journey };

/**
 * Phase 10 fictional identifiers. The discussion parent is a plain Draft-period anchor so the
 * collaboration suites never depend on a coverage gap calculation or on scheduling state transitions.
 */
export const phase10Ids = {
  discussionPeriod: "40000000-0000-4000-8000-000000000001",
  discussionAnchor: "40000000-0000-4000-8000-000000000002",
  discussionRequest: "40000000-0000-4000-8000-000000000003",
  secondDiscussionPeriod: "40000000-0000-4000-8000-000000000004",
  secondDiscussionAnchor: "40000000-0000-4000-8000-000000000005",
  secondDiscussionRequest: "40000000-0000-4000-8000-000000000006",
  outsiderAdmin: "phase10-admin-outsider",
  outsiderEmployee: "phase10-employee-outsider",
};

export const phase10Notes = {
  sharedNote: "Fictional shared operational briefing for the discussion fixtures.",
  sharedNoteEdited: "Fictional shared operational briefing, revised.",
  sharedNoteArchived: "Fictional superseded briefing",
  managementPrivate: "Fictional private supervision note",
  managementShared: "Fictional shared-upward supervision note",
  discussion: "Fictional replacement coordination message",
};

/**
 * Seeds the Phase 3/4 operational fixtures plus one fictional replacement request whose participants
 * are the requester (Ava, in-scope Admin) and a nominated employee (Eli, Team Alpha). No employee is
 * a participant merely because of their role.
 */
export async function seedPhase10Journey(databaseUrl) {
  await seedPhase4Journey(databaseUrl);
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("begin");
    // A fictional outsider Admin in Team Bravo with no Alpha Client, Project, or Location scope.
    await client.query("insert into users (id, display_name, role) values ($1,'Ola Unscoped','ADMIN') on conflict (id) do nothing", [phase10Ids.outsiderAdmin]);
    await client.query("insert into employee_profiles (user_id, employee_code, team) values ($1,'P10-ADM-O','team:bravo') on conflict (user_id) do nothing", [phase10Ids.outsiderAdmin]);
    await client.query("insert into users (id, display_name, role) values ($1,'Otto Unscoped','EMPLOYEE') on conflict (id) do nothing", [phase10Ids.outsiderEmployee]);
    await client.query("insert into employee_profiles (user_id, employee_code, team) values ($1,'P10-EMP-O','team:bravo') on conflict (user_id) do nothing", [phase10Ids.outsiderEmployee]);

    // The participants are signable mock personas so the browser journey can use the same fixtures.
    const periods = [
      [phase10Ids.discussionPeriod, "2027-10-01", phase10Ids.discussionAnchor, "mock-employee-cora", "2027-10-12"],
      [phase10Ids.secondDiscussionPeriod, "2027-11-01", phase10Ids.secondDiscussionAnchor, "mock-employee-dan", "2027-11-12"],
    ];
    for (const [periodId, month, anchorId, employeeUserId, date] of periods) {
      await client.query(
        "insert into schedule_periods (id, client_id, planning_month, lineage_id, status) values ($1,$2,$3,$1,'DRAFT') on conflict (id) do nothing",
        [periodId, phase3Ids.alphaClient, month],
      );
      await client.query(
        "insert into schedule_assignments (id, schedule_period_id, employee_user_id, project_id, location_id, assignment_date, start_time, end_time) values ($1,$2,$3,$4,$5,$6,'09:00','11:00') on conflict (id) do nothing",
        [anchorId, periodId, employeeUserId, phase3Ids.alphaProjectOne, phase3Ids.alphaLocation, date],
      );
    }

    const requests = [
      [phase10Ids.discussionRequest, "ADD_COVERAGE_ASSIGNMENT", phase10Ids.discussionAnchor, "mock-admin-ava", "mock-employee-cora"],
      [phase10Ids.secondDiscussionRequest, "REPLACE_ASSIGNMENT", phase10Ids.secondDiscussionAnchor, "mock-admin-ben", "mock-employee-dan"],
    ];
    for (const [id, intent, anchorId, requesterUserId, nominatedEmployeeUserId] of requests) {
      await client.query(
        "insert into replacement_requests (id, intent, status, anchor_assignment_id, requester_user_id, nominated_employee_user_id, observed_required_employee_count, observed_eligible_employee_count) values ($1,$2::replacement_request_intent,'PENDING',$3,$4,$5,2,1) on conflict (id) do nothing",
        [id, intent, anchorId, requesterUserId, nominatedEmployeeUserId],
      );
    }
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; } finally { await client.end(); }
}
