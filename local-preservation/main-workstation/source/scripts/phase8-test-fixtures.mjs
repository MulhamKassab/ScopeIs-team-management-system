import pg from "pg";
import { phase3Ids } from "./phase4-test-fixtures.mjs";

export async function seedPhase8MapJourney(databaseUrl) {
  const client = new pg.Client({ connectionString: databaseUrl }); await client.connect();
  try { await client.query("begin");
    await client.query("insert into employee_planning_locations (employee_user_id,latitude,longitude) values ('mock-employee-cora',25.2048,55.2708),('mock-employee-dan',25.245,55.31)");
    const period = await client.query("insert into schedule_periods (client_id,planning_month,lineage_id,status,is_current,published_at) values ($1,'2027-05-01',gen_random_uuid(),'PUBLISHED',true,'2027-05-01T08:00:00Z') returning id", [phase3Ids.alphaClient]);
    await client.query("insert into schedule_assignments (schedule_period_id,employee_user_id,project_id,location_id,assignment_date,start_time,end_time) values ($1,'mock-employee-cora',$2,$3,'2027-05-12','09:00','11:00'),($1,'mock-employee-dan',$2,$3,'2027-05-12','12:00','14:00')", [period.rows[0].id, phase3Ids.alphaProjectOne, phase3Ids.alphaLocation]);
    const draft = await client.query("insert into schedule_periods (client_id,planning_month,lineage_id,status,is_current) values ($1,'2027-06-01',gen_random_uuid(),'DRAFT',false) returning id", [phase3Ids.alphaClient]);
    await client.query("insert into schedule_assignments (schedule_period_id,employee_user_id,project_id,location_id,assignment_date,start_time,end_time) values ($1,'mock-employee-cora',$2,$3,'2027-05-12','15:00','16:00')", [draft.rows[0].id, phase3Ids.alphaProjectOne, phase3Ids.alphaLocation]);
    await client.query("insert into leave_requests (employee_user_id,start_date,end_date,status,private_reason,decision_response) values ('mock-employee-cora','2027-05-12','2027-05-12','APPROVED','private fictional reason','private response')");
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; } finally { await client.end(); }
}
