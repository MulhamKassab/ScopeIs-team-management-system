import pg from "pg";
import { phase3Ids } from "./phase3-test-fixtures.mjs";

export const responsiveIds = {
  pendingLeave: "60000000-0000-4000-8000-000000000001",
  ticketWorkspace: "60000000-0000-4000-8000-000000000002",
  ticketWorkspaceTwo: "60000000-0000-4000-8000-000000000003",
  ticketBoard: "60000000-0000-4000-8000-000000000004",
  ticketBoardTwo: "60000000-0000-4000-8000-000000000005",
  ticketBoardThree: "60000000-0000-4000-8000-000000000006",
  ticket: "60000000-0000-4000-8000-000000000007",
};

/** Additional fictional edge cases; called only inside the owned disposable responsive database. */
export async function seedResponsiveEdgeCases(databaseUrl) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("begin");
    await client.query("update users set display_name=$1 where id='mock-employee-cora'", ["Cora Bell · " + "CapabilityCoordination".repeat(3)]);
    await client.query("update clients set company_name=$1 where id=$2", ["Alpha Facilities · " + "InternationalEngineering".repeat(3), phase3Ids.alphaClient]);
    await client.query("insert into leave_requests (id,employee_user_id,start_date,end_date,status,private_reason) values ($1,'mock-employee-cora','2027-10-18','2027-10-19','PENDING',$2)", [responsiveIds.pendingLeave, "Fictional family leave. " + "LongUnbrokenReference".repeat(6)]);
    for (const recipient of ["mock-super-admin-nora", "mock-admin-ava", "mock-employee-cora"]) {
      await client.query("insert into notifications (recipient_user_id,event_type,related_record_type,related_record_id) values ($1,'leave.submitted','leave_request',$2)", [recipient, responsiveIds.pendingLeave]);
    }
    // Populated Company tickets exercise destination names, long instructions,
    // relationships and all status columns without touching the persistent demo.
    await client.query("insert into ticket_workspaces (id,name,client_id,created_by_user_id) values ($1,$3,$5,'mock-super-admin-nora'),($2,$4,$5,'mock-super-admin-nora')", [responsiveIds.ticketWorkspace, responsiveIds.ticketWorkspaceTwo, "Responsive maintenance · " + "InternationalEngineering".repeat(3), "Responsive delivery", phase3Ids.alphaClient]);
    await client.query("insert into ticket_boards (id,workspace_id,name,status,created_by_user_id) values ($1,$4,$6,'PUBLISHED','mock-super-admin-nora'),($2,$4,'Responsive inspection','PUBLISHED','mock-super-admin-nora'),($3,$5,'Responsive delivery dashboard','PUBLISHED','mock-super-admin-nora')", [responsiveIds.ticketBoard, responsiveIds.ticketBoardTwo, responsiveIds.ticketBoardThree, responsiveIds.ticketWorkspace, responsiveIds.ticketWorkspaceTwo, "Responsive coordination · " + "DashboardReference".repeat(3)]);
    for (const workspaceId of [responsiveIds.ticketWorkspace, responsiveIds.ticketWorkspaceTwo]) {
      await client.query("insert into ticket_workspace_members (workspace_id,user_id,granted_by_user_id) values ($1,'mock-admin-ava','mock-super-admin-nora'),($1,'mock-employee-cora','mock-super-admin-nora')", [workspaceId]);
    }
    const statuses = ["OPEN", "PLANNED", "IN_PROGRESS", "ON_HOLD", "CLOSED"];
    for (const [index, status] of statuses.entries()) {
      const ticket = await client.query("insert into tickets (id,board_id,subject,status,ticket_date,summary,on_hold_reason,creator_user_id) values (coalesce($1::uuid,gen_random_uuid()),$2,$3,$4,'2027-10-12',$5,$6,'mock-employee-cora') returning id", [index === 0 ? responsiveIds.ticket : null, [responsiveIds.ticketBoard, responsiveIds.ticketBoardTwo, responsiveIds.ticketBoardThree][index % 3], `Responsive ${status} ticket · ` + "CapabilityCoordination".repeat(4), status, "Fictional work instruction. " + "LongUnbrokenInstruction".repeat(12), status === "ON_HOLD" ? "Waiting for a fictional delivery confirmation." : null]);
      await client.query("insert into ticket_participants (ticket_id,user_id,role,granted_by_user_id) values ($1,'mock-admin-ava','ASSIGNEE','mock-employee-cora'),($1,'mock-employee-dan','OBSERVER','mock-employee-cora')", [ticket.rows[0].id]);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { await client.end(); }
}
