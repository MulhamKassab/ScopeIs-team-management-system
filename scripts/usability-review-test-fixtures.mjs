import pg from "pg";
import { phase3Ids } from "./phase4-test-fixtures.mjs";
export const usabilityIds = { leave: "16101600-0000-4000-8000-000000000001" };
export async function seedUsabilityReview(databaseUrl) {
  const client = new pg.Client({ connectionString: databaseUrl }); await client.connect();
  try {
    await client.query("begin");
    await client.query("update locations set address=$1 where id=$2", ["Fictional location \u2014 review entrance", phase3Ids.alphaLocation]);
    await client.query("update clients set service_summary=$1 where id=$2", ["Fictional service \u2014 support", phase3Ids.alphaClient]);
    await client.query("update projects set name=$1 where id=$2", ["Alpha Modernization \u2014 review", phase3Ids.alphaProjectOne]);
    const work = await client.query("select a.id,a.employee_user_id from schedule_assignments a join schedule_periods p on p.id=a.schedule_period_id where p.status='PUBLISHED' and p.is_current and a.assignment_date='2027-05-12' order by a.start_time");
    for (const row of work.rows) await client.query("insert into replacement_requests(intent,anchor_assignment_id,requester_user_id,nominated_employee_user_id,observed_required_employee_count,observed_eligible_employee_count) values('REPLACE_ASSIGNMENT',$1,'mock-super-admin-nora',$2,1,0)", [row.id, row.employee_user_id === "mock-employee-cora" ? null : "mock-employee-cora"]);
    await client.query("insert into leave_requests(id,employee_user_id,start_date,end_date,private_reason) values($1,'mock-employee-cora','2027-05-12','2027-05-13','Fictional reviewer context example')", [usabilityIds.leave]);
    await client.query("insert into leave_requests(employee_user_id,start_date,end_date,status) values('mock-employee-cora','2027-05-12','2027-05-13','CANCELLED')");
    const workspace = (await client.query("insert into ticket_workspaces(name,created_by_user_id) values('Fictional vacation review','mock-super-admin-nora') returning id")).rows[0].id;
    const board = (await client.query("insert into ticket_boards(workspace_id,name,status,created_by_user_id) values($1,'Fictional assigned work','PUBLISHED','mock-super-admin-nora') returning id", [workspace])).rows[0].id;
    const ticket = (await client.query("insert into tickets(board_id,subject,ticket_date,due_date,creator_user_id) values($1,$2,'2027-05-01','2027-05-15','mock-super-admin-nora') returning id", [board, "Fictional equipment review \u2014 checks"])).rows[0].id;
    await client.query("insert into ticket_participants(ticket_id,user_id,role,granted_by_user_id) values($1,'mock-employee-cora','ASSIGNEE','mock-super-admin-nora')", [ticket]);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; } finally { await client.end(); }
}

export async function assertUsabilityStoredTextPreserved(databaseUrl) {
  const client = new pg.Client({ connectionString: databaseUrl }); await client.connect();
  try {
    const location = (await client.query("select address from locations where id=$1", [phase3Ids.alphaLocation])).rows[0];
    const project = (await client.query("select name from projects where id=$1", [phase3Ids.alphaProjectOne])).rows[0];
    if (location?.address !== "Fictional location \u2014 review entrance" || project?.name !== "Alpha Modernization \u2014 review") throw new Error("Presentation formatting rewrote stored source text.");
    process.stdout.write("Stored source text preserved after browser journeys; only displayed typography was normalized.\n");
  } finally { await client.end(); }
}
