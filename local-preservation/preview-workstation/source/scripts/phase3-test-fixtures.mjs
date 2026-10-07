import pg from "pg";

export const phase3Ids = {
  alphaClient: "10000000-0000-4000-8000-000000000001", bravoClient: "10000000-0000-4000-8000-000000000002", gammaClient: "10000000-0000-4000-8000-000000000003", implicitClient: "10000000-0000-4000-8000-000000000004",
  alphaProjectOne: "20000000-0000-4000-8000-000000000001", alphaProjectTwo: "20000000-0000-4000-8000-000000000002", bravoProject: "20000000-0000-4000-8000-000000000003", bravoSibling: "20000000-0000-4000-8000-000000000004", gammaProject: "20000000-0000-4000-8000-000000000005", implicitProject: "20000000-0000-4000-8000-000000000006",
  alphaLocation: "30000000-0000-4000-8000-000000000001", bravoLocation: "30000000-0000-4000-8000-000000000002", gammaLocation: "30000000-0000-4000-8000-000000000003", implicitLocation: "30000000-0000-4000-8000-000000000004",
};

export async function seedPhase3Journey(databaseUrl) {
  const client = new pg.Client({ connectionString: databaseUrl }); await client.connect();
  try {
    await client.query("begin");
    await client.query("update users set role='ADMIN', display_name='Dan Unscoped' where id='mock-employee-dan'");
    const designation = await client.query("insert into designations (name, sort_order) values ('Field Engineer', 1) returning id");
    const skill = await client.query("insert into skills (name) values ('Industrial Controls') returning id");
    await client.query(`insert into employee_profiles (user_id, employee_code, work_email, professional_summary, designation_id, team, manager_user_id, working_pattern)
      values ('mock-super-admin-nora','P3-SA-001','nora@example.test','Fictional Super Admin',$1,'team:alpha',null,'Hybrid weekdays'),
             ('mock-admin-ava','P3-ADM-A','ava@example.test','Client-scoped Admin',$1,'team:alpha','mock-super-admin-nora','Office weekdays'),
             ('mock-admin-ben','P3-ADM-B','ben@example.test','Project and Location scoped Admin',$1,'team:bravo','mock-super-admin-nora','Remote weekdays'),
             ('mock-employee-cora','P3-EMP-C','cora@example.test','Fictional Employee',$1,'team:alpha','mock-admin-ava','Hybrid weekdays'),
             ('mock-employee-dan','P3-ADM-U','dan@example.test','Unscoped relationship-only Admin',$1,'team:bravo','mock-super-admin-nora','Office weekdays')`, [designation.rows[0].id]);
    await client.query(`insert into clients (id, company_name, account_manager_user_id, service_summary, service_start_date)
      values ($1,'Alpha Facilities','mock-admin-ava','Fictional Alpha facilities services','2026-01-01'),
             ($2,'Bravo Engineering',null,'Fictional Bravo services','2026-02-01'),
             ($3,'Gamma Operations',null,'Fictional Gamma services','2026-03-01'),
             ($4,'Implicit Authority Test','mock-employee-dan','Relationships never authorize','2026-04-01')`, [phase3Ids.alphaClient, phase3Ids.bravoClient, phase3Ids.gammaClient, phase3Ids.implicitClient]);
    await client.query(`insert into projects (id, client_id, name, status, responsible_admin_user_id)
      values ($1,$7,'Alpha Modernization','ACTIVE','mock-admin-ava'),($2,$7,'Alpha Support','PLANNED','mock-admin-ava'),
             ($3,$8,'Bravo Scoped Project','ACTIVE','mock-admin-ben'),($4,$8,'Bravo Hidden Sibling','ACTIVE',null),
             ($5,$9,'Gamma Hidden Project','ACTIVE',null),($6,$10,'Implicit Responsible Project','ACTIVE','mock-employee-dan')`, [phase3Ids.alphaProjectOne, phase3Ids.alphaProjectTwo, phase3Ids.bravoProject, phase3Ids.bravoSibling, phase3Ids.gammaProject, phase3Ids.implicitProject, phase3Ids.alphaClient, phase3Ids.bravoClient, phase3Ids.gammaClient, phase3Ids.implicitClient]);
    await client.query(`insert into locations (id, client_id, name, address, latitude, longitude, site_hours, access_instructions, visit_requirements)
      values ($1,$5,'Alpha Shared Site','10 Fictional Alpha Street',25.20,55.30,'Weekdays 08:00–17:00','Report to fictional reception','Safety induction'),
             ($2,$6,'Bravo Site','20 Fictional Bravo Road',null,null,'Flexible','Call fictional desk',null),
             ($3,$7,'Gamma Scoped Location','30 Fictional Gamma Avenue',null,null,'Weekdays','Use visitor entrance',null),
             ($4,$8,'Implicit Location','40 No Authority Lane',null,null,null,'Relationship-only test',null)`, [phase3Ids.alphaLocation, phase3Ids.bravoLocation, phase3Ids.gammaLocation, phase3Ids.implicitLocation, phase3Ids.alphaClient, phase3Ids.bravoClient, phase3Ids.gammaClient, phase3Ids.implicitClient]);
    await client.query("insert into project_locations (project_id, location_id) values ($1,$2),($3,$2),($4,$5),($6,$7)", [phase3Ids.alphaProjectOne, phase3Ids.alphaLocation, phase3Ids.alphaProjectTwo, phase3Ids.bravoProject, phase3Ids.bravoLocation, phase3Ids.gammaProject, phase3Ids.gammaLocation]);
    await client.query("insert into admin_scope_grants (user_id, scope_type, scope_reference) values ('mock-admin-ava','CLIENT',$1),('mock-admin-ben','PROJECT',$2),('mock-admin-ben','LOCATION',$3) on conflict (user_id,scope_type,scope_reference) do nothing", [phase3Ids.alphaClient, phase3Ids.bravoProject, phase3Ids.gammaLocation]);
    await client.query("insert into operational_contacts (client_id,name,role_title,work_phone,work_email) values ($1,'Alpha Operations Desk','Coordinator','555-0101','alpha.ops@example.test')", [phase3Ids.alphaClient]);
    await client.query("insert into staffing_requirements (project_id,required_skill_id,required_employee_count,note) values ($1,$2,2,'Requirement only; no schedule')", [phase3Ids.alphaProjectOne, skill.rows[0].id]);
    await client.query("insert into operational_notes (location_id,author_user_id,content) values ($1,'mock-super-admin-nora','Shared fictional access briefing')", [phase3Ids.alphaLocation]);
    await client.query("insert into operational_employee_relations (client_id,employee_user_id) values ($1,'mock-employee-dan')", [phase3Ids.implicitClient]);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; } finally { await client.end(); }
}
