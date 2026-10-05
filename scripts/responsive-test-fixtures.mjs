import pg from "pg";
import { phase3Ids } from "./phase3-test-fixtures.mjs";

export const responsiveIds = { pendingLeave: "60000000-0000-4000-8000-000000000001" };

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
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { await client.end(); }
}
