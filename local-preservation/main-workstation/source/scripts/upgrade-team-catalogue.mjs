/** Guarded additive upgrade for the sole, user-approved company demo database. */
import pg from 'pg';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inspectMigrationState, validateRepositoryMigrationHistory } from './phase2-migration-core.mjs';
const configPath=process.env.SCOPEIS_TEAM_UPGRADE_CONFIG;
if(!configPath) throw new Error('Provide a private operator configuration.');
const {databaseUrl,backupPath,receiptPath}=JSON.parse(await readFile(configPath,'utf8'));
const target=new URL(databaseUrl);
if(target.hostname!=='ep-steep-poetry-avl3re9t.c-11.us-east-1.aws.neon.tech' || target.pathname!=='/scopeis_company_demo' || !['neondb_owner','scopeis_company_demo_owner'].includes(target.username) || target.searchParams.get('sslmode')!=='require') throw new Error('Only the approved dedicated demo database is permitted.');
const client=new pg.Client({connectionString:databaseUrl}); await client.connect();
const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
try {
 const before=await inspectMigrationState(client);
 if(before.state!=='D' || JSON.stringify(before.pending)!==JSON.stringify(['0014_team_catalogue'])) throw new Error('Expected only the new team migration to be pending.');
 const names=(await client.query("select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name")).rows.map(row=>row.table_name);
 const snapshot={capturedAt:new Date().toISOString(),schema:before.fingerprint,ledger:before.ledger,tables:{}};
 for(const name of names) snapshot.tables[name]=(await client.query(`select * from "${name}" order by 1`)).rows;
 if(snapshot.tables.users.length!==7 || snapshot.tables.employee_profiles.length!==7 || snapshot.tables.user_credentials.length!==7) throw new Error('The approved seven-person roster must remain intact.');
 if(!backupPath.startsWith('/Users/mulhamkassab/.codex/backups/scopeis/') || !receiptPath.startsWith('/Users/mulhamkassab/.codex/backups/scopeis/')) throw new Error('Use the private backup directory.');
 await mkdir('/Users/mulhamkassab/.codex/backups/scopeis',{recursive:true});
 await writeFile(backupPath,JSON.stringify(snapshot),{mode:0o600,flag:'wx'});
 if(!process.argv.includes('--apply')) { process.stdout.write(JSON.stringify({dryRun:true,pending:before.pending,users:7,backupSaved:true})+'\n'); }
 else {
  // The existing operator has INSERT on the verified ledger, but cannot issue the
  // driver's redundant CREATE TABLE IF NOT EXISTS in the application-owned schema.
  // Apply the immutable canonical SQL and its exact ledger entry in one transaction.
  const {manifest}=await validateRepositoryMigrationHistory();
  const migration=manifest.migrations.at(-1);
  if(migration.tag!=='0014_team_catalogue') throw new Error('Unexpected latest migration.');
  await client.query('begin');
  let result;
  try {
    await client.query("select pg_advisory_xact_lock(hashtext('scopeis:team-catalogue-migration'))");
    const locked=await inspectMigrationState(client);
    if(locked.state!=='D' || JSON.stringify(locked.pending)!==JSON.stringify(['0014_team_catalogue'])) throw new Error('Migration state changed.');
    await client.query(await readFile('src/db/migrations/0014_team_catalogue.sql','utf8'));
    await client.query('insert into drizzle.__drizzle_migrations (hash,created_at) values ($1,$2)',[migration.hash,migration.when]);
    const after=await inspectMigrationState(client);
    if(after.state!=='D' || after.pending.length) throw new Error('Canonical schema verification failed.');
    await client.query('grant select,insert,update on table teams to scopeis_company_demo_owner');
    await client.query('commit'); result={after};
  } catch(error) { await client.query('rollback'); throw error; }
  for(const name of names) { const after=(await client.query(`select * from "${name}" order by 1`)).rows; if(fingerprint(after)!==fingerprint(snapshot.tables[name])) throw new Error(`Existing data changed in ${name}.`); }
  const privileges=await client.query("select privilege from unnest(array['SELECT','INSERT','UPDATE']) privilege where not has_table_privilege('scopeis_company_demo_owner','teams',privilege)");
  if(privileges.rows.length) await client.query('grant select,insert,update on table teams to scopeis_company_demo_owner');
  const teams=(await client.query('select id,name,version from teams order by id')).rows;
  const receipt={verifiedAt:new Date().toISOString(),migration:'0014_team_catalogue',state:result.after.state,pending:result.after.pending,schemaFingerprint:result.after.fingerprint.hash,existingTablesUnchanged:names.length,users:7,profiles:7,credentials:7,teams};
  await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n',{mode:0o600}); process.stdout.write(JSON.stringify(receipt)+'\n');
 }
} finally { await client.end(); }
