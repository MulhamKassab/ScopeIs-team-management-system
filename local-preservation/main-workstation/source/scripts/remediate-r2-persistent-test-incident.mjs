import pg from "pg";
import { assertPhase1TestDatabaseSafety, loadPhase1TestConfiguration } from "./phase1-test-environment.mjs";

const manifest = [
  ["bfca64c0-582c-4db0-b024-941e0a6898fa", "4ec55d7e-0b76-4089-9fa8-d24ed90078b9", "mock-super-admin-nora", "2026-08-29T17:40:51.083Z"],
  ["e69644b6-eb4d-40ea-9ce2-742f89393a2a", "af281eb9-cc3e-44d5-ad0d-cacce748a61c", "mock-admin-ava", "2026-08-29T17:40:51.107Z"],
  ["5b1701f2-5d6d-4991-b319-bb769107be18", "e1f6a674-459f-427a-8037-8d3f78340999", "mock-admin-ben", "2026-08-29T17:40:51.111Z"],
  ["1ccaaad0-047d-49e8-abb0-354f2dbc498e", "5faade5e-360a-4900-92db-4cea8a3e2bc3", "mock-employee-cora", "2026-08-29T17:40:51.115Z"],
  ["f34b809c-308c-4c5c-b0d8-d490b9cde531", "c603ca33-3b40-4261-8549-e67f8443a3e4", "mock-employee-dan", "2026-08-29T17:40:51.118Z"],
  ["206b9522-f0be-4367-b160-ef40e2c3221b", "4142a69c-4320-466f-ab90-22bebf4364c8", "mock-super-admin-nora", "2026-08-29T17:40:51.122Z"],
  ["20b7a2e2-bea2-497b-a289-a9b564043d36", "0a53da22-040d-4bb9-a987-3e82b151d26e", "mock-employee-cora", "2026-08-29T17:40:51.128Z"],
  ["4033762b-9204-4729-8544-883bcf069700", "e763f027-4aee-4fc9-90df-0132e1ad940c", "mock-admin-ava", "2026-08-29T17:40:51.132Z"],
  ["4105b995-efbf-4bb7-a4cd-b833a95ebc81", "c9cf1821-4145-4ecc-8408-f11d4e2a7838", "mock-admin-ben", "2026-08-29T17:40:51.136Z"],
  ["70324aef-aad7-43d7-939a-8e88ec86e647", "e289b857-7783-4de2-aeb4-4472d8dde57d", "mock-admin-ava", "2026-08-29T17:40:51.137Z"],
];
const sessionIds = manifest.map(([sessionId]) => sessionId); const auditIds = manifest.map(([, auditId]) => auditId);
const configuration = await loadPhase1TestConfiguration(); await assertPhase1TestDatabaseSafety(configuration);
const client = new pg.Client({ connectionString: configuration.databaseUrl }); await client.connect();
try {
  await client.query("begin");
  const rows = await client.query(`select s.id as session_id,s.user_id,s.created_at,a.id as audit_id,a.actor_user_id,a.action,a.target_type,a.target_id,a.occurred_at from sessions s join audit_events a on a.target_type='session' and a.target_id=s.id::text where s.id=any($1::uuid[]) and a.id=any($2::uuid[]) for update of s,a`, [sessionIds, auditIds]);
  if (rows.rowCount !== manifest.length) throw new Error("Manifest row count changed; cleanup refused.");
  for (const [sessionId, auditId, userId, timestamp] of manifest) {
    const row = rows.rows.find((candidate) => candidate.session_id === sessionId && candidate.audit_id === auditId);
    if (!row || row.user_id !== userId || row.actor_user_id !== userId || row.action !== "auth.mock_session.started" || row.target_type !== "session" || row.target_id !== sessionId || new Date(row.created_at).toISOString() !== timestamp || new Date(row.occurred_at).toISOString() !== timestamp) throw new Error("Manifest content changed; cleanup refused.");
  }
  const extra = await client.query("select count(*)::int as count from audit_events where target_type='session' and target_id=any($1::text[]) and id<>all($2::uuid[])", [sessionIds, auditIds]);
  if (extra.rows[0].count !== 0) throw new Error("Unexpected dependent audit record; cleanup refused.");
  const removedAudits = await client.query("delete from audit_events where id=any($1::uuid[]) returning id", [auditIds]);
  if (removedAudits.rowCount !== auditIds.length) throw new Error("Audit delete count mismatch; cleanup refused.");
  const removedSessions = await client.query("delete from sessions where id=any($1::uuid[]) returning id", [sessionIds]);
  if (removedSessions.rowCount !== sessionIds.length) throw new Error("Session delete count mismatch; cleanup refused.");
  await client.query("commit");
  process.stdout.write(JSON.stringify({ removedSessions: removedSessions.rowCount, removedAudits: removedAudits.rowCount }) + "\n");
} catch (error) { await client.query("rollback"); throw error; } finally { await client.end(); }
