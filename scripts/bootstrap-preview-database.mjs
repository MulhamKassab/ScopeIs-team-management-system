import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  inspectMigrationState,
  runNormalMigrator,
  validateRepositoryMigrationHistory,
} from "./phase2-migration-core.mjs";

export const EXPECTED_PREVIEW_NEON_PROJECT_ID = "blue-firefly-93492385";
export const FORBIDDEN_PRODUCTION_NEON_PROJECT_ID = "morning-flower-68935124";

const BOOTSTRAP_LOCK = "scopeis_preview_database_bootstrap_r1";
const PERSONA_IDS = [
  "mock-super-admin-nora",
  "mock-admin-ava",
  "mock-admin-ben",
  "mock-employee-cora",
  "mock-employee-dan",
];

const personas = [
  ["mock-super-admin-nora", "Nora Albright", "SUPER_ADMIN"],
  ["mock-admin-ava", "Ava Mercer", "ADMIN"],
  ["mock-admin-ben", "Ben Iqbal", "ADMIN"],
  ["mock-employee-cora", "Cora Bell", "EMPLOYEE"],
  ["mock-employee-dan", "Dan Rowan", "EMPLOYEE"],
];

const profiles = [
  ["mock-super-admin-nora", "SA-001", "nora@example.test", "001", "Fictional Super Admin", "team:alpha", null, "Head Office", "Hybrid weekdays"],
  ["mock-admin-ava", "ADM-ALPHA-001", "ava@example.test", "010", "Fictional scoped Admin", "team:alpha", "mock-super-admin-nora", "Alpha office", "Office weekdays"],
  ["mock-admin-ben", "ADM-BRAVO-001", "ben@example.test", "020", "Fictional scoped Admin", "team:bravo", "mock-super-admin-nora", "Bravo office", "Remote weekdays"],
  ["mock-employee-cora", "EMP-ALPHA-001", "cora@example.test", "100", "Alpha profile", "team:alpha", "mock-admin-ava", "Private Alpha location", "Hybrid weekdays"],
  ["mock-employee-dan", "EMP-BRAVO-001", "dan@example.test", "200", "Bravo profile", "team:bravo", "mock-admin-ben", "Private Bravo location", "Remote weekdays"],
];

function migrationSummary(state) {
  return {
    state: state.state,
    description: state.description,
    pending: state.pending,
    ledgerRows: state.ledger?.rows.length ?? 0,
    diagnostics: state.diagnostics,
  };
}

export async function isPortableCurrentPreviewMigrationState(state) {
  const { manifest } = await validateRepositoryMigrationHistory();
  const expected = manifest.states.phase2EmployeeCode;
  const rows = state.ledger?.rows ?? [];
  const ledgerMatches = state.ledger?.valid === true &&
    rows.length === manifest.migrations.length &&
    rows.every((row, index) =>
      row.hash === manifest.migrations[index].hash &&
      Number(row.created_at) === manifest.migrations[index].when
    );
  return ledgerMatches &&
    JSON.stringify(state.fingerprint?.tables) === JSON.stringify(expected.tables) &&
    JSON.stringify(state.fingerprint?.enumTypes) === JSON.stringify(expected.enumTypes) &&
    state.fingerprint?.sectionHashes?.enums === expected.sectionHashes.enums;
}

export function assertPreviewBootstrapEnvironment(input) {
  if (input.SCOPEIS_PREVIEW_DATABASE_BOOTSTRAP !== "true") return false;
  if (input.VERCEL !== "1") throw new Error("Preview database bootstrap requires the Vercel build environment.");
  if (input.VERCEL_ENV !== "preview") throw new Error("Preview database bootstrap refuses every non-Preview Vercel environment.");
  if (input.VERCEL_GIT_COMMIT_REF !== "preview") throw new Error("Preview database bootstrap is restricted to the preview Git branch.");
  if (input.MOCK_AUTH_ENABLED !== "true") throw new Error("Preview database bootstrap requires fictional mock authentication.");
  if (input.NEON_PROJECT_ID === FORBIDDEN_PRODUCTION_NEON_PROJECT_ID) {
    throw new Error("Preview database bootstrap refused the Production Neon project.");
  }
  if (input.NEON_PROJECT_ID !== EXPECTED_PREVIEW_NEON_PROJECT_ID) {
    throw new Error("Preview database bootstrap requires the exact reviewed Preview Neon project.");
  }
  if (!input.DATABASE_URL) throw new Error("Preview database bootstrap requires the Preview DATABASE_URL.");
  if (input.SCOPEIS_E2E_TEST === "true") throw new Error("Preview database bootstrap refuses the disposable E2E environment.");
  return true;
}

async function seedFictionalPreviewData(client) {
  const unexpectedUsers = await client.query(
    "select id from users where not (id = any($1::text[])) order by id limit 1",
    [PERSONA_IDS],
  );
  if (unexpectedUsers.rowCount > 0) throw new Error("Preview seed refused a database containing a non-fixture user.");

  await client.query("begin");
  try {
    for (const [id, displayName, role] of personas) {
      await client.query(
        "insert into users (id, display_name, role, active) values ($1,$2,$3::system_role,true) on conflict (id) do update set display_name=excluded.display_name, role=excluded.role, active=true, updated_at=now()",
        [id, displayName, role],
      );
    }

    await client.query("delete from admin_scope_grants where user_id = any($1::text[])", [PERSONA_IDS]);
    await client.query(
      "insert into admin_scope_grants (user_id, scope_type, scope_reference) values ($1,'TEAM',$2),($3,'TEAM',$4)",
      ["mock-admin-ava", "team:alpha", "mock-admin-ben", "team:bravo"],
    );

    const designation = await client.query(
      "insert into designations (name, sort_order, active) values ('Field Engineer',1,true) on conflict (name) do update set sort_order=excluded.sort_order, active=true, archived_at=null, updated_at=now() returning id",
    );
    const designationId = designation.rows[0]?.id;
    if (!designationId) throw new Error("Preview seed could not resolve the fictional designation.");

    for (const profile of profiles) {
      await client.query(
        "insert into employee_profiles (user_id,employee_code,work_email,work_phone,professional_summary,designation_id,team,manager_user_id,default_work_location,working_pattern) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (user_id) do update set employee_code=excluded.employee_code, work_email=excluded.work_email, work_phone=excluded.work_phone, professional_summary=excluded.professional_summary, designation_id=excluded.designation_id, team=excluded.team, manager_user_id=excluded.manager_user_id, default_work_location=excluded.default_work_location, working_pattern=excluded.working_pattern, updated_at=now()",
        [...profile.slice(0, 5), designationId, ...profile.slice(5)],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function verifyFictionalPreviewData(client) {
  const result = await client.query(
    "select (select count(*)::int from users where id = any($1::text[])) as users, (select count(*)::int from employee_profiles where user_id = any($1::text[])) as profiles, (select count(*)::int from admin_scope_grants where active=true and ((user_id='mock-admin-ava' and scope_reference='team:alpha') or (user_id='mock-admin-ben' and scope_reference='team:bravo'))) as grants",
    [PERSONA_IDS],
  );
  const row = result.rows[0];
  if (row?.users !== 5 || row?.profiles !== 5 || row?.grants !== 2) throw new Error("Preview fixture verification failed.");
  return row;
}

export async function bootstrapPreviewDatabase(input = process.env) {
  if (!assertPreviewBootstrapEnvironment(input)) {
    process.stdout.write("Preview database bootstrap disabled; no database connection opened.\n");
    return { skipped: true };
  }

  const client = new pg.Client({ connectionString: input.DATABASE_URL });
  await client.connect();
  let locked = false;
  try {
    await client.query("select pg_advisory_lock(hashtext($1))", [BOOTSTRAP_LOCK]);
    locked = true;
    const before = await inspectMigrationState(client);
    const portableBefore = await isPortableCurrentPreviewMigrationState(before);
    if (before.state !== "A" && before.state !== "D" && !portableBefore) {
      throw new Error(
        "Preview bootstrap accepts only a fresh database or an exact migration-ledger state. " +
        JSON.stringify(migrationSummary(before)),
      );
    }
    if (!portableBefore && (before.state !== "D" || before.pending.length > 0)) {
      await runNormalMigrator(input.DATABASE_URL);
    }

    const after = await inspectMigrationState(client);
    const portableAfter = await isPortableCurrentPreviewMigrationState(after);
    if ((after.state !== "D" || after.pending.length !== 0) && !portableAfter) {
      throw new Error(
        "Preview database did not reach the exact current migration state. " +
        JSON.stringify(migrationSummary(after)),
      );
    }

    await seedFictionalPreviewData(client);
    const counts = await verifyFictionalPreviewData(client);
    process.stdout.write(
      "Preview database bootstrap complete: " +
      counts.users +
      " fictional users, " +
      counts.profiles +
      " profiles, and " +
      counts.grants +
      " active Admin TEAM grants.\n",
    );
    return { skipped: false, state: portableAfter ? "D_PORTABLE_PREVIEW" : after.state, counts };
  } finally {
    if (locked) await client.query("select pg_advisory_unlock(hashtext($1))", [BOOTSTRAP_LOCK]);
    await client.end();
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (fileURLToPath(import.meta.url) === invokedPath) {
  bootstrapPreviewDatabase().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
