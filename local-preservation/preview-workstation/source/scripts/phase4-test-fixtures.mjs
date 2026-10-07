import pg from "pg";
import { seedPhase3Journey, phase3Ids } from "./phase3-test-fixtures.mjs";

export { phase3Ids };
export const phase4Ids = { alphaEmployee: "phase4-employee-alpha", bravoEmployee: "phase4-employee-bravo", locationAdmin: "phase4-admin-location" };

export async function seedPhase4Journey(databaseUrl) {
  await seedPhase3Journey(databaseUrl);
  const client = new pg.Client({ connectionString: databaseUrl }); await client.connect();
  try {
    await client.query("begin");
    await client.query("insert into users (id, display_name, role) values ($1,'Eli Alpha','EMPLOYEE'),($2,'Bea Bravo','EMPLOYEE'),($3,'Lina Location','ADMIN') on conflict (id) do nothing", [phase4Ids.alphaEmployee, phase4Ids.bravoEmployee, phase4Ids.locationAdmin]);
    await client.query("insert into employee_profiles (user_id, employee_code, team) values ($1,'P4-EMP-A','team:alpha'),($2,'P4-EMP-B','team:bravo'),($3,'P4-ADM-L','team:bravo') on conflict (user_id) do nothing", [phase4Ids.alphaEmployee, phase4Ids.bravoEmployee, phase4Ids.locationAdmin]);
    await client.query("insert into admin_scope_grants (user_id, scope_type, scope_reference) values ($1,'LOCATION',$2) on conflict (user_id,scope_type,scope_reference) do nothing", [phase4Ids.locationAdmin, phase3Ids.gammaLocation]);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; } finally { await client.end(); }
}
