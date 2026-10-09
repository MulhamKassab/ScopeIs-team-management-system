import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { inspectMigrationState, reconcileMigrationState, repositoryRoot, validateRepositoryMigrationHistory } from "../../scripts/phase2-migration-core.mjs";
import { fingerprintPublicSchema } from "../../scripts/schema-fingerprint.mjs";

const execFileAsync = promisify(execFile);
const adminConnectionString = process.env.SCOPEIS_PHASE2_ADMIN_DATABASE_URL;
if (!adminConnectionString) throw new Error("Migration tests require the explicit disposable PostgreSQL administrator target.");
const adminUrl = new URL(adminConnectionString);
if (!["localhost", "127.0.0.1", "::1"].includes(adminUrl.hostname)) throw new Error("Migration tests require loopback PostgreSQL.");
const createdDatabases = new Set<string>();
let sequence = 0;

function nextDatabaseName(label: string) {
  sequence += 1;
  const name = `scopeis_p2_${label}_test_${process.pid}_${sequence}`.toLowerCase();
  if (!/^[a-z0-9_]+$/.test(name) || !name.includes("test") || name.length > 63) throw new Error("Unsafe disposable database name.");
  return name;
}

function databaseUrl(name: string) {
  const url = new URL(adminConnectionString!);
  url.pathname = `/${name}`;
  return url.toString();
}

async function createDatabase(name: string) {
  const admin = new pg.Client({ connectionString: adminConnectionString });
  await admin.connect();
  try {
    const safety = await admin.query("select current_database() as database_name, inet_server_addr()::text as server_address, inet_client_addr()::text as client_address");
    const row = safety.rows[0];
    expect(row.database_name).toMatch(/test/i);
    expect([row.server_address, row.client_address].every((value) => value === "::1" || String(value).includes("127.0.0.1"))).toBe(true);
    expect((await admin.query("select 1 from pg_database where datname=$1", [name])).rowCount).toBe(0);
    await admin.query(`create database "${name}"`);
    createdDatabases.add(name);
  } finally {
    await admin.end();
  }
}

async function dropDatabase(name: string) {
  if (!createdDatabases.has(name)) throw new Error(`Refusing to drop untracked database ${name}.`);
  const admin = new pg.Client({ connectionString: adminConnectionString });
  await admin.connect();
  try {
    await admin.query("select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()", [name]);
    await admin.query(`drop database "${name}"`);
    createdDatabases.delete(name);
  } finally {
    await admin.end();
  }
}

async function withDatabase<T>(label: string, callback: (url: string, name: string) => Promise<T>) {
  const name = nextDatabaseName(label);
  await createDatabase(name);
  try {
    return await callback(databaseUrl(name), name);
  } finally {
    await dropDatabase(name);
  }
}

async function applySql(url: string, files: string[]) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    for (const file of files) await client.query(await readFile(`${repositoryRoot}/src/db/migrations/${file}`, "utf8"));
  } finally {
    await client.end();
  }
}

async function inspect(url: string) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try { return await inspectMigrationState(client); } finally { await client.end(); }
}

async function runCli(url: string, ...args: string[]) {
  try {
    const result = await execFileAsync(process.execPath, [`${repositoryRoot}/scripts/phase2-migration-state.mjs`, ...args, "--allow-disposable-test"], {
      cwd: repositoryRoot,
      env: { ...process.env, SCOPEIS_MIGRATION_DATABASE_URL: url },
    });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const failure = error as Error & { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? 1, stdout: failure.stdout ?? "", stderr: failure.stderr ?? "" };
  }
}

beforeAll(async () => {
  await validateRepositoryMigrationHistory();
});

afterAll(async () => {
  for (const name of [...createdDatabases]) await dropDatabase(name);
});

describe("Phase 2 database foundation reconciliation", { timeout: 60_000, hookTimeout: 60_000 }, () => {
  it("performs a clean normal migration install and is idempotent", async () => withDatabase("clean", async (url) => {
    const first = await reconcileMigrationState(url, { allowDisposableTest: true, apply: true });
    expect(first.before.state).toBe("A");
    expect(first.after?.state).toBe("D");
    expect(first.after?.pending).toEqual([]);
    expect(first.after?.fingerprint.tables).toHaveLength(41);
    expect(first.after?.ledger.rows).toHaveLength(16);
    const second = await reconcileMigrationState(url, { allowDisposableTest: true, apply: true });
    expect(second.before.state).toBe("D");
    expect(second.after?.state).toBe("D");
    expect(second.after?.fingerprint.hash).toBe(first.after?.fingerprint.hash);
  }));

  it("upgrades the previous account-management schema and backfills teams without changing membership or grants", async () => withDatabase("team_upgrade", async (url) => {
    const { journal, migrations } = await validateRepositoryMigrationHistory();
    await applySql(url, journal.entries.slice(0, 14).map((entry: { tag: string }) => `${entry.tag}.sql`));
    const client = new pg.Client({ connectionString: url }); await client.connect();
    try {
      await client.query('create schema drizzle; create table drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)');
      for (const migration of migrations.slice(0, 14)) await client.query('insert into drizzle.__drizzle_migrations (hash,created_at) values ($1,$2)', [migration.hash,migration.folderMillis]);
      await client.query("insert into users(id,display_name,role) values ('upgrade-person','Upgrade person','ADMIN')");
      await client.query("insert into employee_profiles(user_id,employee_code,team) values ('upgrade-person','9999','team:operations')");
      await client.query("insert into admin_scope_grants(user_id,scope_type,scope_reference) values ('upgrade-person','TEAM','team:operations')");
    } finally { await client.end(); }
    const before = await inspect(url);
    expect(before.state).toBe("D");
    expect(before.pending).toEqual(["0014_team_catalogue", "0015_company_tickets"]);
    const applied = await reconcileMigrationState(url, { allowDisposableTest: true, apply: true });
    expect(applied.after?.state).toBe("D");
    expect(applied.after?.pending).toEqual([]);
    const verification = new pg.Client({ connectionString: url }); await verification.connect();
    try {
      expect((await verification.query("select id,name from teams")).rows).toEqual([{id:"team:operations",name:"Operations"}]);
      expect((await verification.query("select team from employee_profiles")).rows[0].team).toBe("team:operations");
      expect((await verification.query("select scope_reference from admin_scope_grants")).rows[0].scope_reference).toBe("team:operations");
    } finally { await verification.end(); }
  }));

  it("adds Company tickets to the team-catalogue schema without changing employee, schedule, leave, or historical ledger facts", async () => withDatabase("ticket_upgrade", async (url) => {
    const { journal, migrations, manifest } = await validateRepositoryMigrationHistory();
    await applySql(url, journal.entries.slice(0, 15).map((entry: { tag: string }) => `${entry.tag}.sql`));
    const client = new pg.Client({ connectionString: url }); await client.connect();
    let priorFacts: Record<string, unknown[]>;
    let priorLedger: unknown[];
    const readFacts = async (connection: pg.Client) => {
      const facts: Record<string, unknown[]> = {};
      for (const table of manifest.states.teamCatalogue.tables) {
        if (!/^[a-z_]+$/.test(table)) throw new Error("Unsafe authoritative table name.");
        facts[table] = (await connection.query(`select to_jsonb(record) as fact from "${table}" record order by to_jsonb(record)::text`)).rows;
      }
      return facts;
    };
    try {
      await client.query('create schema drizzle; create table drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)');
      for (const migration of migrations.slice(0, 15)) await client.query('insert into drizzle.__drizzle_migrations (hash,created_at) values ($1,$2)', [migration.hash, migration.folderMillis]);
      await client.query("insert into users(id,display_name,role) values ('upgrade-manager','Upgrade manager','SUPER_ADMIN'),('upgrade-employee','Upgrade employee','EMPLOYEE')");
      await client.query("insert into teams(id,name) values ('team:upgrade','Upgrade team')");
      await client.query("insert into employee_profiles(user_id,employee_code,team,manager_user_id,working_pattern,version) values ('upgrade-employee','upgrade-002','team:upgrade','upgrade-manager','Office weekdays',3)");
      const skill = (await client.query("insert into skills(name) values ('Upgrade skill') returning id")).rows[0].id;
      await client.query("insert into employee_skills(employee_user_id,skill_id,proficiency_description,verified) values ('upgrade-employee',$1,'Recorded before ticket integration',true)", [skill]);
      const clientId = (await client.query("insert into clients(company_name) values ('Upgrade client') returning id")).rows[0].id;
      const projectId = (await client.query("insert into projects(client_id,name,status) values ($1,'Upgrade project','ACTIVE') returning id", [clientId])).rows[0].id;
      const locationId = (await client.query("insert into locations(client_id,name,address) values ($1,'Upgrade office','Fictional upgrade address') returning id", [clientId])).rows[0].id;
      await client.query("insert into project_locations(project_id,location_id) values ($1,$2)", [projectId, locationId]);
      const periodId = (await client.query("insert into schedule_periods(client_id,planning_month,lineage_id,status,is_current,published_at,version) values ($1,'2026-10-01',$2,'PUBLISHED',true,'2026-10-01T05:00:00Z',4) returning id", [clientId, randomUUID()])).rows[0].id;
      await client.query("insert into schedule_assignments(schedule_period_id,employee_user_id,project_id,location_id,assignment_date,start_time,end_time,shared_instruction,version) values ($1,'upgrade-employee',$2,$3,'2026-10-08','09:00','13:00','Retained published instruction',2)", [periodId, projectId, locationId]);
      await client.query("insert into leave_requests(employee_user_id,start_date,end_date,status,private_reason,decision_response,reviewed_by_user_id,decided_at,version) values ('upgrade-employee','2026-10-12','2026-10-13','APPROVED','Retained private reason','Approved before integration','upgrade-manager','2026-10-02T05:00:00Z',3)");
      await client.query("insert into notifications(recipient_user_id,event_type,related_record_type,related_record_id) values ('upgrade-employee','schedule.published','schedule_period',$1)", [periodId]);
      priorFacts = await readFacts(client);
      priorLedger = (await client.query("select id,hash,created_at::text as created_at from drizzle.__drizzle_migrations order by id")).rows;
    } finally { await client.end(); }
    const before = await inspect(url);
    expect(before.state).toBe("D");
    expect(before.pending).toEqual(["0015_company_tickets"]);
    const applied = await reconcileMigrationState(url, { allowDisposableTest: true, apply: true });
    expect(applied.after?.state).toBe("D");
    expect(applied.after?.pending).toEqual([]);
    expect(applied.after?.ledger.rows).toHaveLength(16);
    for (const table of manifest.states.teamCatalogue.tables) expect(applied.after?.fingerprint.tableHashes[table]).toBe(manifest.states.teamCatalogue.tableHashes[table]);
    const verification = new pg.Client({ connectionString: url }); await verification.connect();
    try {
      expect(await readFacts(verification)).toEqual(priorFacts!);
      expect((await verification.query("select id,hash,created_at::text as created_at from drizzle.__drizzle_migrations order by id limit 15")).rows).toEqual(priorLedger!);
      expect((await verification.query("select count(*)::int as count from tickets")).rows[0].count).toBe(0);
    } finally { await verification.end(); }
  }));

  it("dry-runs and safely adopts an exact ledgerless Phase 1 database", async () => withDatabase("phase1", async (url) => {
    await applySql(url, ["0000_phase_1_foundation.sql"]);
    expect((await inspect(url)).state).toBe("B");
    const dryRun = await reconcileMigrationState(url, { allowDisposableTest: true });
    expect(dryRun.dryRun).toBe(true);
    expect((await inspect(url)).state).toBe("B");
    const applied = await reconcileMigrationState(url, { allowDisposableTest: true, apply: true });
    expect(applied.after?.state).toBe("D");
    expect(applied.after?.ledger.rows).toHaveLength(16);
    expect((await reconcileMigrationState(url, { allowDisposableTest: true })).before.state).toBe("D");
  }));

  it("dry-runs and safely adopts an exact ledgerless Phase 1+2 database", async () => withDatabase("phase12", async (url) => {
    await applySql(url, ["0000_phase_1_foundation.sql", "0001_phase_2_employee_capabilities.sql"]);
    expect((await inspect(url)).state).toBe("C");
    expect((await reconcileMigrationState(url, { allowDisposableTest: true })).before.state).toBe("C");
    expect((await inspect(url)).state).toBe("C");
    const applied = await reconcileMigrationState(url, { allowDisposableTest: true, apply: true });
    expect(applied.after?.state).toBe("D");
    expect(applied.after?.ledger.rows).toHaveLength(16);
    expect((await reconcileMigrationState(url, { allowDisposableTest: true, apply: true })).after?.state).toBe("D");
  }));

  it("refuses a partial Phase 2 schema with a non-zero CLI exit and no mutation", async () => withDatabase("partial", async (url) => {
    await applySql(url, ["0000_phase_1_foundation.sql"]);
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query("create type evidence_review_state as enum ('unreviewed', 'reviewed', 'verified')");
    const before = await fingerprintPublicSchema(client);
    await client.end();
    const result = await runCli(url, "reconcile", "--apply");
    expect(result.code).toBe(2);
    expect(result.stdout).toContain('"state": "E"');
    expect(result.stdout).not.toContain(url);
    const after = await inspect(url);
    expect(after.state).toBe("E");
    expect(after.fingerprint.hash).toBe(before.hash);
    expect(after.ledger.tableExists).toBe(false);
  }));

  it("refuses ledger/schema disagreement with a non-zero exit and no mutation", async () => withDatabase("ledgerdrift", async (url) => {
    await reconcileMigrationState(url, { allowDisposableTest: true, apply: true });
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query("drop table employee_files");
    const before = await fingerprintPublicSchema(client);
    const ledgerBefore = await client.query("select count(*)::int as count from drizzle.__drizzle_migrations");
    await client.end();
    const result = await runCli(url, "reconcile", "--apply");
    expect(result.code).toBe(2);
    const verification = new pg.Client({ connectionString: url });
    await verification.connect();
    expect((await fingerprintPublicSchema(verification)).hash).toBe(before.hash);
    expect((await verification.query("select count(*)::int as count from drizzle.__drizzle_migrations")).rows[0].count).toBe(ledgerBefore.rows[0].count);
    await verification.end();
  }));

  it("uses all eight authoritative Drizzle tables with real relationships and constraints", async () => withDatabase("runtime", async (url) => {
    await reconcileMigrationState(url, { allowDisposableTest: true, apply: true });
    const pool = new pg.Pool({ connectionString: url, max: 1 });
    const db = drizzle({ client: pool, schema });
    const suffix = randomUUID();
    await db.insert(schema.users).values([
      { id: `employee-${suffix}`, displayName: "Disposable Employee", role: "EMPLOYEE" },
      { id: `manager-${suffix}`, displayName: "Disposable Manager", role: "SUPER_ADMIN" },
    ]);
    const [designation] = await db.insert(schema.designations).values({ name: `Engineer ${suffix}` }).returning();
    const [skill] = await db.insert(schema.skills).values({ name: `Skill ${suffix}` }).returning();
    const [label] = await db.insert(schema.arrangementLabels).values({ name: `Label ${suffix}`, color: "#123456" }).returning();
    await db.insert(schema.employeeProfiles).values({ userId: `employee-${suffix}`, employeeCode: `E-${suffix}`, designationId: designation.id, managerUserId: `manager-${suffix}`, team: "Alpha" });
    await db.insert(schema.employeeSkills).values({ employeeUserId: `employee-${suffix}`, skillId: skill.id, proficiencyDescription: "Experienced" });
    const [evidence] = await db.insert(schema.employeeEvidence).values({ ownerUserId: `employee-${suffix}`, uploaderUserId: `employee-${suffix}`, kind: "certification", title: "Disposable evidence", relatedSkillId: skill.id, issueDate: "2026-01-01", expiryDate: "2027-01-01" }).returning();
    await db.insert(schema.employeeFiles).values({ evidenceId: evidence.id, ownerUserId: `employee-${suffix}`, storageKey: `test/${suffix}`, originalFilename: "test.pdf", contentType: "application/pdf", sizeBytes: 10 });
    await db.insert(schema.employeeManagementNotes).values({ subjectUserId: `employee-${suffix}`, authorUserId: `manager-${suffix}`, authorRole: "SUPER_ADMIN", visibility: "private_to_author", content: "Disposable note" });
    expect(label.name).toContain("Label");
    expect(await db.select().from(schema.designations)).toHaveLength(1);
    expect(await db.select().from(schema.skills)).toHaveLength(1);
    expect(await db.select().from(schema.arrangementLabels)).toHaveLength(1);
    expect(await db.select().from(schema.employeeProfiles)).toHaveLength(1);
    expect(await db.select().from(schema.employeeSkills)).toHaveLength(1);
    expect(await db.select().from(schema.employeeEvidence)).toHaveLength(1);
    expect(await db.select().from(schema.employeeFiles)).toHaveLength(1);
    expect(await db.select().from(schema.employeeManagementNotes)).toHaveLength(1);
    await db.update(schema.employeeProfiles).set({ version: 2 }).where(eq(schema.employeeProfiles.userId, `employee-${suffix}`));
    expect((await db.select().from(schema.employeeProfiles))[0].version).toBe(2);
    await expect(db.insert(schema.skills).values({ name: `Skill ${suffix}` })).rejects.toThrow();
    await expect(db.insert(schema.employeeFiles).values({ evidenceId: evidence.id, ownerUserId: `employee-${suffix}`, storageKey: `bad/${suffix}`, originalFilename: "bad", contentType: "text/plain", sizeBytes: 0 })).rejects.toThrow();
    await expect(db.insert(schema.employeeEvidence).values({ ownerUserId: `employee-${suffix}`, uploaderUserId: `employee-${suffix}`, kind: "certification", title: "Bad dates", issueDate: "2027-01-01", expiryDate: "2026-01-01" })).rejects.toThrow();
    await pool.end();
  }));

  it("uses all seven Company ticket tables with enforced relationships and content constraints", async () => withDatabase("ticket_runtime", async (url) => {
    await reconcileMigrationState(url, { allowDisposableTest: true, apply: true });
    const pool = new pg.Pool({ connectionString: url, max: 1 });
    const db = drizzle({ client: pool, schema });
    const actor = `ticket-runtime-${randomUUID()}`;
    try {
      await db.insert(schema.users).values({ id: actor, displayName: "Ticket runtime Employee", role: "EMPLOYEE" });
      const [workspace] = await db.insert(schema.ticketWorkspaces).values({ name: "Independent Company workspace", createdByUserId: actor }).returning();
      await db.insert(schema.ticketWorkspaceMembers).values({ workspaceId: workspace.id, userId: actor, grantedByUserId: actor });
      const [board] = await db.insert(schema.ticketBoards).values({ workspaceId: workspace.id, name: "Published work", status: "PUBLISHED", createdByUserId: actor }).returning();
      const [ticket] = await db.insert(schema.tickets).values({ boardId: board.id, subject: "Runtime ticket", ticketDate: "2026-10-08", creatorUserId: actor }).returning();
      await db.insert(schema.ticketParticipants).values({ ticketId: ticket.id, userId: actor, role: "ASSIGNEE", grantedByUserId: actor });
      await db.insert(schema.ticketWorkLogs).values({ ticketId: ticket.id, authorUserId: actor, description: "Retained progress", durationMinutes: 30 });
      await db.insert(schema.ticketFiles).values({ ticketId: ticket.id, ownerUserId: actor, uploaderUserId: actor, fileName: "runtime.pdf", contentType: "application/pdf", byteSize: 10, storageKey: `test/tickets/${ticket.id}/runtime.pdf` });
      expect(ticket.number).toBeGreaterThan(0);
      for (const table of [schema.ticketWorkspaces, schema.ticketWorkspaceMembers, schema.ticketBoards, schema.tickets, schema.ticketParticipants, schema.ticketWorkLogs, schema.ticketFiles]) expect(await db.select().from(table)).toHaveLength(1);
      await expect(db.delete(schema.ticketBoards).where(eq(schema.ticketBoards.id, board.id))).rejects.toThrow();
      await expect(db.insert(schema.ticketWorkspaceMembers).values({ workspaceId: workspace.id, userId: actor, grantedByUserId: actor })).rejects.toThrow();
      await expect(db.insert(schema.tickets).values({ boardId: board.id, subject: "Bad hold", status: "ON_HOLD", ticketDate: "2026-10-08", creatorUserId: actor })).rejects.toThrow();
      // The Company workflow permits a due date before the ticket date; chronology was not approved as a new policy.
      await db.insert(schema.tickets).values({ boardId: board.id, subject: "Recorded overdue work", ticketDate: "2026-10-08", dueDate: "2026-10-07", creatorUserId: actor });
      await expect(db.insert(schema.ticketWorkLogs).values({ ticketId: ticket.id, authorUserId: actor, description: "Bad duration", durationMinutes: 0 })).rejects.toThrow();
      await expect(db.insert(schema.ticketFiles).values({ ticketId: ticket.id, ownerUserId: actor, uploaderUserId: actor, fileName: "bad.pdf", contentType: "application/pdf", byteSize: 0, storageKey: "test/bad-ticket.pdf" })).rejects.toThrow();
      await expect(db.insert(schema.ticketParticipants).values({ ticketId: randomUUID(), userId: actor, role: "OBSERVER", grantedByUserId: actor })).rejects.toThrow();
      expect(await db.select().from(schema.tickets)).toHaveLength(2);
      expect(await db.select().from(schema.scheduleAssignments)).toHaveLength(0);
      expect(await db.select().from(schema.leaveRequests)).toHaveLength(0);
    } finally { await pool.end(); }
  }));

  it("detects migration, journal, manifest, and TypeScript-schema drift", async () => {
    await validateRepositoryMigrationHistory();
    await withDatabase("migrated", async (migratedUrl) => withDatabase("exported", async (exportedUrl) => {
      await reconcileMigrationState(migratedUrl, { allowDisposableTest: true, apply: true });
      const exported = await execFileAsync(process.execPath, [`${repositoryRoot}/node_modules/drizzle-kit/bin.cjs`, "export", "--config=drizzle.certification.config.ts"], { cwd: repositoryRoot });
      const exportedClient = new pg.Client({ connectionString: exportedUrl });
      await exportedClient.connect();
      await exportedClient.query(exported.stdout);
      const migratedClient = new pg.Client({ connectionString: migratedUrl });
      await migratedClient.connect();
      const migratedFingerprint = await fingerprintPublicSchema(migratedClient);
      const exportedFingerprint = await fingerprintPublicSchema(exportedClient);
      expect(exportedFingerprint.hash).toBe(migratedFingerprint.hash);
      await migratedClient.end();
      await exportedClient.end();
    }));
  });

  it("cleans up a disposable database even after a deliberate callback failure", async () => {
    let name = "";
    await expect(withDatabase("cleanup", async (_url, databaseName) => { name = databaseName; throw new Error("deliberate cleanup check"); })).rejects.toThrow("deliberate cleanup check");
    const admin = new pg.Client({ connectionString: adminConnectionString });
    await admin.connect();
    expect((await admin.query("select 1 from pg_database where datname=$1", [name])).rowCount).toBe(0);
    await admin.end();
  });
});
