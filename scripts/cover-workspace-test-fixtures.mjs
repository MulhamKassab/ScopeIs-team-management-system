import { randomUUID } from "node:crypto";
import pg from "pg";
import { phase3Ids } from "./phase4-test-fixtures.mjs";

/** Fictional Cover data for the guarded disposable browser runner only. */
export async function seedCoverWorkspace(databaseUrl) {
  const target = new URL(databaseUrl);
  if (!['127.0.0.1','localhost','[::1]'].includes(target.hostname) || !/test|disposable/.test(target.pathname)) throw new Error("Cover fixtures require a disposable loopback database.");
  const client = new pg.Client({ connectionString: databaseUrl }); await client.connect();
  try {
    await client.query("begin");
    await client.query("insert into employee_skills (employee_user_id,skill_id) select u,required_skill_id from staffing_requirements cross join unnest($1::text[]) u where project_id=$2 on conflict do nothing", [["mock-employee-cora","phase4-employee-alpha"],phase3Ids.alphaProjectOne]);
    await client.query("insert into employee_planning_locations (employee_user_id,latitude,longitude) values ('mock-employee-cora',25.15,55.25) on conflict do nothing");
    for (const month of ["2045-09","2045-10"]) {
      const published = randomUUID(), draft = randomUUID();
      await client.query("insert into schedule_periods (id,client_id,planning_month,lineage_id,status,is_current,published_at) values ($1,$2,$3,$1,'PUBLISHED',true,now())", [published,phase3Ids.alphaClient,`${month}-01`]);
      await client.query("insert into schedule_assignments (schedule_period_id,employee_user_id,project_id,location_id,assignment_date,start_time,end_time,shared_instruction) values ($1,'mock-employee-cora',$2,$3,$4,'09:00','11:00','Fictional Cover browser journey')",[published,phase3Ids.alphaProjectOne,phase3Ids.alphaLocation,`${month}-12`]);
      await client.query("insert into schedule_periods (id,client_id,planning_month,lineage_id,status) values ($1,$2,$3,$1,'DRAFT')",[draft,phase3Ids.gammaClient,`${month}-01`]);
    }
    await client.query("commit");
  } catch(error) { await client.query("rollback"); throw error; } finally { await client.end(); }
}
