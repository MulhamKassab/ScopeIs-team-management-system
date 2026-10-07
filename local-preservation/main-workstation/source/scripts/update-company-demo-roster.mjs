import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {inspectMigrationState} from './phase2-migration-core.mjs';
import {validateCompanyDemo} from './seed-company-demo.mjs';
import {workforce, businesses, loginNames, visitTimes, userId, dayOffset} from './company-demo-data.mjs';

// Explicit one-time correction of the approved fictional dataset, never a startup migration.
// Hanna and Omar must first receive credentials through the normal account service.
export const removedSampleKeys=['layla','maya','tariq','fatima','hassan','leila','arjun','samira','yousef','rina','khalid','sophia'];
const marker='demo.company.roster.updated';
export function assertRosterTarget(connectionString,{disposableTest=false}={}) {
  let url;try {url=new URL(connectionString);}catch {throw new Error('Invalid roster database target.');}
  const database=url.pathname.slice(1);
  const local=disposableTest&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&/^scopeis_company_demo_[a-z0-9_]+_test$/.test(database);
  const hosted=['ep-steep-poetry-avl3re9t.c-11.us-east-1.aws.neon.tech','ep-steep-poetry-avl3re9t-pooler.c-11.us-east-1.aws.neon.tech'].includes(url.hostname)&&database==='scopeis_company_demo'&&['neondb_owner','scopeis_company_demo_owner'].includes(url.username)&&url.searchParams.get('sslmode')==='require';
  if(!['postgresql:','postgres:'].includes(url.protocol)||(!local&&!hosted))throw new Error('Roster updates are restricted to the approved company demo.');
  return {database};
}
export async function validateSevenPersonRoster(client) {
  const rows=(await client.query('select u.id,u.display_name,u.role,u.active,c.normalized_username,c.normalized_email from users u left join user_credentials c on c.user_id=u.id order by c.normalized_username')).rows;
  if(rows.length!==7||workforce.some(([key,name,role])=>!rows.some(u=>u.display_name===name&&u.role===role&&u.active&&u.normalized_username===loginNames[key]&&u.normalized_email===`${loginNames[key]}@example.test`)))throw new Error('The confirmed seven-person roster is incomplete.');
  const proof=await validateCompanyDemo(client);
  if(proof.counts.employee_profiles!==7||proof.counts.user_credentials!==7)throw new Error('Every confirmed person requires one profile and one login.');
  return proof;
}
export async function updateCompanyDemoRoster(connectionString,{disposableTest=false,dryRun=true,failureBeforeCommit=false}={}) {
  const target=assertRosterTarget(connectionString,{disposableTest});
  const c=new pg.Client({connectionString});await c.connect();
  try {
    if((await c.query('select current_database() as name')).rows[0].name!==target.database)throw new Error('Connected roster target mismatch.');
    if((await inspectMigrationState(c)).state!=='D')throw new Error('Complete canonical migrations are required.');
    await c.query('begin');await c.query("select pg_advisory_xact_lock(hashtext('scopeis.company.demo.initialization'))");
    if((await c.query('select 1 from audit_events where action=$1',[marker])).rowCount) {
      const proof=await validateSevenPersonRoster(c);await c.query('rollback');return {status:'unchanged',...proof};
    }
    const initialized=(await c.query("select metadata from audit_events where action='demo.company.initialized'")).rows;
    if(initialized.length!==1||initialized[0].metadata.datasetVersion!==1||initialized[0].metadata.fictional!==true)throw new Error('Only the original fictional company fixture can be corrected.');
    const baseDate=initialized[0].metadata.baseDate;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(baseDate))throw new Error('The fixture base date is missing.');
    // Lock every record being corrected. A concurrent normal edit must finish before this operation.
    for(const table of ['users','user_credentials','employee_profiles','schedule_periods','schedule_assignments','replacement_requests','leave_requests','employee_evidence','employee_files','discussion_messages'])await c.query(`select * from ${table} for update`);
    const hanna=(await c.query("select u.id,u.role,u.active from users u join user_credentials c on c.user_id=u.id where c.normalized_username='hanna' and c.normalized_email='hanna@example.test'")).rows;
    if(hanna.length!==1||hanna[0].role!=='SUPER_ADMIN'||!hanna[0].active)throw new Error('Create Hanna through normal Super Admin account management first.');
    const removed=removedSampleKeys.map(userId);
    const retained=workforce.map(([key])=>key==='hanna'?hanna[0].id:userId(key));
    const users=(await c.query('select id,role from users')).rows;
    if(users.length!==19||users.some(u=>![...retained,...removed].includes(u.id))||workforce.some(([key,,role])=>!users.some(u=>u.id===(key==='hanna'?hanna[0].id:userId(key))&&u.role===role))||users.some(u=>removed.includes(u.id)&&u.role!=='EMPLOYEE'))throw new Error('Unexpected workforce; refusing to remove company records.');
    const credentials=(await c.query('select user_id,normalized_username,password_hash from user_credentials')).rows;
    if(credentials.length!==7||credentials.some(u=>!retained.includes(u.user_id))||['nora','ava','ben','cora','dan','omar'].some(key=>!credentials.some(u=>u.user_id===userId(key)&&u.normalized_username===key)))throw new Error('Expected original logins plus Hanna and Omar are required.');
    if((await c.query('select 1 from employee_files where owner_user_id=any($1::text[]) or uploader_user_id=any($1::text[])',[removed])).rowCount)throw new Error('An extra employee owns file history; manual review is required.');
    if((await c.query('select 1 from replacement_requests where status<>\'PENDING\'')).rowCount)throw new Error('A sample replacement was already decided; manual review is required.');
    const before=await validateCompanyDemo(c);
    if(before.counts.schedule_assignments!==57||before.counts.schedule_periods!==19||before.counts.leave_requests!==4||before.counts.replacement_requests!==2||(await c.query('select 1 from schedule_assignments where version<>1 union all select 1 from schedule_periods where version<>1')).rowCount)throw new Error('The original sample plan has changed; manual review is required.');
    for(const [key,name] of workforce) {
      const id=key==='hanna'?hanna[0].id:userId(key);const login=loginNames[key];
      await c.query('update users set display_name=$2,active=true,session_version=session_version+1,version=version+1,updated_at=now() where id=$1',[id,name]);
      await c.query('update user_credentials set username=$2,normalized_username=$2,email=$3,normalized_email=$3,version=version+1,updated_at=now() where user_id=$1',[id,login,`${login}@example.test`]);
      await c.query("update employee_profiles set work_email=$2,team='team:operations',version=version+1,updated_at=now() where user_id=$1",[id,`${login}@example.test`]);
    }
    await c.query('update sessions set revoked_at=now(),updated_at=now() where user_id=any($1::text[]) and revoked_at is null',[retained]);
    await c.query("update admin_scope_grants set scope_reference='team:operations',version=version+1,updated_at=now() where scope_type='TEAM' and user_id=any($1::text[])",[[userId('ava'),userId('ben')]]);
    for(const [key,,,,,skills] of workforce.filter(x=>x[2]==='EMPLOYEE'))for(const name of skills) {
      const skill=(await c.query('select id from skills where name=$1 and active',[name])).rows[0];if(!skill)throw new Error('A required sample skill is missing.');
      await c.query("insert into employee_skills(id,employee_user_id,skill_id,proficiency_description) values($1,$2,$3,'Recorded demonstration skill') on conflict(employee_user_id,skill_id) do nothing",[randomUUID(),userId(key),skill.id]);
    }
    for(const [key,name,,,,,,employee] of businesses) {
      const client=(await c.query('select id from clients where company_name=$1',[name])).rows;if(client.length!==1)throw new Error('An expected sample client is missing.');
      const clientId=client[0].id;
      await c.query('update schedule_assignments a set employee_user_id=$2,start_time=$3,end_time=$4,version=a.version+1,updated_at=now() from schedule_periods s where s.id=a.schedule_period_id and s.client_id=$1',[clientId,userId(employee),...visitTimes[key]]);
      await c.query('update operational_employee_relations r set employee_user_id=$2,version=r.version+1,updated_at=now() from projects p where r.project_id=p.id and p.client_id=$1',[clientId,userId(employee)]);
      await c.query("update notifications n set recipient_user_id=$2 from schedule_periods s where n.related_record_type='schedule_period' and n.related_record_id=s.id::text and s.client_id=$1",[clientId,userId(employee)]);
    }
    await c.query('update schedule_periods set version=version+1,updated_at=now()');
    for(const [oldKey,newKey] of [['arjun','omar'],['samira','cora']]) {
      await c.query('update replacement_requests set nominated_employee_user_id=$2,version=version+1,updated_at=now() where nominated_employee_user_id=$1',[userId(oldKey),userId(newKey)]);
      await c.query('update discussion_messages set author_user_id=$2,version=version+1,updated_at=now() where author_user_id=$1',[userId(oldKey),userId(newKey)]);
    }
    for(const [oldKey,newKey] of [['layla','omar'],['tariq','dan']]) {
      await c.query("update notifications set recipient_user_id=$2 where recipient_user_id=$1 and related_record_type='leave_request'",[userId(oldKey),userId(newKey)]);
      await c.query('update leave_requests set employee_user_id=$2,version=version+1,updated_at=now() where employee_user_id=$1',[userId(oldKey),userId(newKey)]);
    }
    await c.query("update leave_requests set start_date=$1,end_date=$2,version=version+1,updated_at=now() where status='APPROVED' and employee_user_id=$3",[dayOffset(baseDate,3),dayOffset(baseDate,4),userId('omar')]);
    await c.query("delete from notifications where related_record_type='employee_evidence' and related_record_id in(select id::text from employee_evidence where owner_user_id=any($1::text[]))",[removed]);
    for(const [table,column] of [['employee_evidence','owner_user_id'],['employee_management_notes','subject_user_id'],['employee_skills','employee_user_id'],['employee_planning_locations','employee_user_id'],['employee_profiles','user_id']])await c.query(`delete from ${table} where ${column}=any($1::text[])`,[removed]);
    await c.query('delete from users where id=any($1::text[])',[removed]);
    const after=(await c.query('select user_id,password_hash from user_credentials')).rows;
    if(after.some(u=>credentials.find(old=>old.user_id===u.user_id)?.password_hash!==u.password_hash))throw new Error('Credential hashes must remain unchanged.');
    const proof=await validateSevenPersonRoster(c);
    await c.query("insert into audit_events(id,actor_user_id,actor_role,authentication_mode,action,target_type,target_id,metadata) values($1,$2,'SUPER_ADMIN','password',$3,'demo_workspace','company-demo-v2',$4)",[randomUUID(),userId('nora'),marker,{datasetVersion:2,fictional:true,baseDate,workforceCount:7,removedSampleCount:12,credentialHashesPreserved:true,explicitFixtureCorrection:true}]);
    if(failureBeforeCommit)throw new Error('Injected roster rollback verification.');
    await c.query(dryRun?'rollback':'commit');return {status:dryRun?'dry-run':'updated',...proof};
  }catch(error){await c.query('rollback').catch(()=>{});throw error;}finally{await c.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try{console.log(JSON.stringify(await updateCompanyDemoRoster(process.env.DATABASE_URL,{dryRun:!process.argv.includes('--apply')}),null,2));}
  catch{console.error('Company roster correction refused or failed. No credentials are printed.');process.exitCode=1;}
}
