import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { inspectMigrationState } from './phase2-migration-core.mjs';
import { workforce, businesses, loginNames, skillCatalog, visitTimes, userId, dayOffset, monthOffset } from './company-demo-data.mjs';

const marker='demo.company.initialized';
const tables=['users','employee_profiles','user_credentials','skills','employee_skills','clients','projects','locations','schedule_periods','schedule_assignments','staffing_requirements','assignment_skill_requirements','leave_requests','replacement_requests','employee_evidence','employee_files','operational_notes','operational_note_revisions','employee_management_notes','discussion_threads','discussion_messages','notifications'];
export function assertDemoTarget(url, { disposableTest=false }={}) {
  let t; try {t=new URL(url);} catch {throw new Error('Invalid demo database URL.');}
  if(!['postgresql:','postgres:'].includes(t.protocol)) throw new Error('PostgreSQL is required.');
  const name=t.pathname.slice(1);
  const local=disposableTest && ['localhost','127.0.0.1','[::1]'].includes(t.hostname) && /^scopeis_company_demo_[a-z0-9_]+_test$/.test(name);
  const hosted=t.hostname==='ep-steep-poetry-avl3re9t.c-11.us-east-1.aws.neon.tech' || t.hostname==='ep-steep-poetry-avl3re9t-pooler.c-11.us-east-1.aws.neon.tech';
  if(!local && !(hosted && name==='scopeis_company_demo' && t.username==='scopeis_company_demo_owner' && t.searchParams.get('sslmode')==='require')) throw new Error('Target is not the dedicated company demo database.');
  return {database:name,local};
}
export async function demoCounts(client) { const out={}; for(const table of tables) out[table]=(await client.query(`select count(*)::int as count from ${table}`)).rows[0].count; return out; }
export async function validateCompanyDemo(client) {
  const invalid=await client.query(`select
    (select count(*) from users u left join employee_profiles e on e.user_id=u.id where e.user_id is null) as missing_profiles,
    (select count(*) from schedule_assignments a join schedule_periods s on s.id=a.schedule_period_id join users u on u.id=a.employee_user_id join projects p on p.id=a.project_id join locations l on l.id=a.location_id where u.role<>'EMPLOYEE' or not u.active or p.status<>'ACTIVE' or l.status<>'ACTIVE' or s.client_id<>p.client_id or s.client_id<>l.client_id or date_trunc('month',a.assignment_date)::date<>s.planning_month or not exists(select 1 from project_locations x where x.project_id=p.id and x.location_id=l.id and x.archived_at is null)) as invalid_assignments,
    (select count(*) from schedule_assignments a join schedule_periods s on s.id=a.schedule_period_id join leave_requests l on l.employee_user_id=a.employee_user_id and a.assignment_date between l.start_date and l.end_date where l.status='APPROVED' and s.is_current) as leave_conflicts,
    (select count(*) from schedule_assignments a join schedule_assignments b on a.id<b.id and a.employee_user_id=b.employee_user_id and a.assignment_date=b.assignment_date and a.start_time<b.end_time and b.start_time<a.end_time join schedule_periods sa on sa.id=a.schedule_period_id join schedule_periods sb on sb.id=b.schedule_period_id where (sa.status<>'PUBLISHED' or sa.is_current) and (sb.status<>'PUBLISHED' or sb.is_current) and a.copied_from_assignment_id is distinct from b.id and b.copied_from_assignment_id is distinct from a.id) as overlaps`);
  if(Object.values(invalid.rows[0]).some(x=>Number(x)!==0)) throw new Error('Demo business integrity validation failed.');
  return {integrity:invalid.rows[0],counts:await demoCounts(client)};
}
export async function seedCompanyDemo(connectionString, {baseDate, pepper, password, disposableTest=false,dryRun=false, failureAfterWorkforce=false}={}) {
  const target=assertDemoTarget(connectionString,{disposableTest});
  if(!/^\d{4}-\d{2}-\d{2}$/.test(baseDate??'') || new Date(`${baseDate}T00:00:00Z`).toISOString().slice(0,10)!==baseDate) throw new Error('An explicit valid base date is required.');
  if(!pepper || Buffer.byteLength(pepper)<32 || !password || password.length>128) throw new Error('Explicit demo credentials are required.');
  const client=new pg.Client({connectionString}); await client.connect();
  try {
    if((await client.query('select current_database() as name')).rows[0].name!==target.database) throw new Error('Connected target mismatch.');
    if((await inspectMigrationState(client)).state!=='D') throw new Error('The demo requires the complete canonical migration ledger.');
    await client.query('begin'); await client.query("select pg_advisory_xact_lock(hashtext('scopeis.company.demo.initialization'))");
    const previous=(await client.query('select metadata from audit_events where action=$1',[marker])).rows[0];
    if(previous) { await client.query('rollback'); return {status:'unchanged',baseDate:previous.metadata.baseDate,...await validateCompanyDemo(client)}; }
    const populated=(await client.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows;
    for(const {tablename} of populated) {
      // The allowance/sequence singleton rows are migration defaults, never company records.
      if(['employee_code_sequence','leave_allowance_settings'].includes(tablename)) continue;
      if((await client.query(`select exists(select 1 from "${tablename.replaceAll('"','""')}") as populated`)).rows[0].populated) throw new Error('Refusing to merge demo data into an existing workspace.');
    }
    const insert=async(table,row)=>{const keys=Object.keys(row); await client.query(`insert into ${table} (${keys.join(',')}) values (${keys.map((_,i)=>`$${i+1}`).join(',')})`,Object.values(row));return row.id;};
    const id=()=>randomUUID(); const ids={skills:{},designations:{},clients:{},projects:{},locations:{},rules:{},periods:{},anchors:{}};
    const audit=async(action,type,targetId,metadata={})=>insert('audit_events',{id:id(),actor_user_id:userId('nora'),actor_role:'SUPER_ADMIN',authentication_mode:'password',action,target_type:type,target_id:targetId,metadata});
    const notify=async(recipient,event,type,related)=>insert('notifications',{id:id(),recipient_user_id:userId(recipient),event_type:event,related_record_type:type,related_record_id:related});
    for(const name of skillCatalog) ids.skills[name]=await insert('skills',{id:id(),name});
    for(const name of new Set(workforce.map(x=>x[4]).filter(Boolean))) ids.designations[name]=await insert('designations',{id:id(),name});
    for(const [sort,name] of ['In-house','Outsourced to Client','Temporary Placement','Scheduled Visit','On-call'].entries()) await insert('arrangement_labels',{id:id(),name,color:['#2563eb','#7c3aed','#0d9488','#d97706','#db2777'][sort],sort_order:sort});
    for(const team of new Set(workforce.map(row=>row[3]))) await insert('teams',{id:`team:${team}`,name:team.replace(/[-_]/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase())});
    for(const [key,name,role] of workforce) await insert('users',{id:userId(key),display_name:name,role,active:true});
    for(const [index,[key,name,role,team,designation,skillNames]] of workforce.entries()) {
      await insert('employee_profiles',{user_id:userId(key),employee_code:String(index+1).padStart(4,'0'),designation_id:designation?ids.designations[designation]:null,team:`team:${team}`,manager_user_id:role==='SUPER_ADMIN'?null:userId(role==='ADMIN'?'nora':key==='cora'?'ava':'ben'),work_email:`${loginNames[key]}@example.test`,professional_summary:designation?`Fictional ${designation.toLowerCase()} in the company demonstration.`:null,default_work_location:'Fictional planning office',working_pattern:'Weekdays; informational only'});
      await insert('employee_planning_locations',{employee_user_id:userId(key),latitude:25.18+(index%5)*0.018,longitude:55.26+(index%4)*0.021});
      for(const skill of skillNames) await insert('employee_skills',{id:id(),employee_user_id:userId(key),skill_id:ids.skills[skill],proficiency_description:'Recorded demonstration skill'});
    }
    await client.query('update employee_code_sequence set next_value=8 where singleton=true');
    // Reuse the application KDF, so a demo credential never drifts from production authentication.
    const {hashPassword}=await import('../src/modules/auth/password.ts');
    for(const key of Object.keys(loginNames)) await insert('user_credentials',{user_id:userId(key),username:loginNames[key],normalized_username:loginNames[key],email:`${loginNames[key]}@example.test`,normalized_email:`${loginNames[key]}@example.test`,password_hash:await hashPassword(password,pepper)});
    if(failureAfterWorkforce) throw new Error('Injected rollback verification.');
    for(const key of ['ava','ben']) await insert('admin_scope_grants',{id:id(),user_id:userId(key),scope_type:'TEAM',scope_reference:'team:operations'});
    for(const [index,[key,name,project,site,lat,lng,admin,employee,skill]] of businesses.entries()) {
      ids.clients[key]=await insert('clients',{id:id(),company_name:name,account_manager_user_id:userId(admin),service_summary:'Fictional technology delivery and managed support.',service_start_date:monthOffset(baseDate,-3)});
      await insert('admin_scope_grants',{id:id(),user_id:userId(admin),scope_type:'CLIENT',scope_reference:ids.clients[key]});
      ids.projects[key]=await insert('projects',{id:id(),client_id:ids.clients[key],name:project,status:'ACTIVE',responsible_admin_user_id:userId(admin),start_date:monthOffset(baseDate,-1),end_date:dayOffset(monthOffset(baseDate,4),-1)});
      await insert('projects',{id:id(),client_id:ids.clients[key],name:['Service expansion','Infrastructure assessment','Completed handover'][index%3],status:['PLANNED','ON_HOLD','COMPLETED'][index%3],responsible_admin_user_id:userId(admin),start_date:monthOffset(baseDate,index%3===2?-3:1)});
      ids.locations[key]=await insert('locations',{id:id(),client_id:ids.clients[key],name:site,address:`Fictional demonstration site — ${site}`,latitude:lat,longitude:lng,site_hours:'08:00–18:00 Asia/Dubai',access_instructions:'Fictional briefing: arrange visitor access with the site coordinator.',visit_requirements:'Demonstration site induction'});
      await insert('project_locations',{id:id(),project_id:ids.projects[key],location_id:ids.locations[key]});
      ids.rules[key]=await insert('staffing_requirements',{id:id(),project_id:ids.projects[key],required_skill_id:ids.skills[skill],required_employee_count:['marina','cedar','vertex'].includes(key)?2:1,note:'Fictional count rule; evaluated independently for each work interval.'});
      await insert('operational_contacts',{id:id(),client_id:ids.clients[key],name:`${name.split(' ')[0]} demo coordinator`,role_title:'Site coordinator',work_email:`coordinator.${key}@example.test`});
      await insert('operational_employee_relations',{id:id(),project_id:ids.projects[key],employee_user_id:userId(employee)});
      const note=await insert('operational_notes',{id:id(),client_id:ids.clients[key],author_user_id:userId(admin),content:'Fictional shared briefing: confirm the weekly delivery plan and record the handover.',version:2});
      await insert('operational_note_revisions',{id:id(),note_id:note,version:1,content:'Fictional initial delivery briefing.',edited_by_user_id:userId(admin)});
      for(const offset of [-1,0,1]) {
        const month=monthOffset(baseDate,offset); const status=offset===1?(index%3===0?'PROPOSED':'DRAFT'):'PUBLISHED';
        const period=await insert('schedule_periods',{id:id(),client_id:ids.clients[key],planning_month:month,lineage_id:id(),status,is_current:status==='PUBLISHED',published_at:status==='PUBLISHED'?new Date():null,proposed_at:status==='PROPOSED'?new Date():null}); ids.periods[`${key}:${offset}`]=period;
        const dates=offset===0?[baseDate,dayOffset(baseDate,2),dayOffset(baseDate,7)].filter(x=>x.slice(0,7)===month.slice(0,7)):[dayOffset(month,6),dayOffset(month,13),dayOffset(month,20)];
        for(const date of dates) {
          const assignment=await insert('schedule_assignments',{id:id(),schedule_period_id:period,employee_user_id:userId(employee),project_id:ids.projects[key],location_id:ids.locations[key],assignment_date:date,start_time:visitTimes[key][0],end_time:visitTimes[key][1],shared_instruction:'Fictional delivery visit. Review the shared project briefing before work.'});
          if(!ids.anchors[`${key}:${offset}`]) ids.anchors[`${key}:${offset}`]=assignment;
          if(key==='cedar' || key==='marina') await insert('assignment_skill_requirements',{id:id(),schedule_assignment_id:assignment,skill_id:ids.skills[key==='cedar'?'Documentation':'Fiber']});
        }
        if(status==='PUBLISHED') {await audit('schedule.published','schedule_period',period,{revisionNumber:1,assignmentCount:dates.length,affectedEmployeeCount:1}); await notify(employee,'schedule.published','schedule_period',period);}
      }
    }
    // A real revision lineage preserves current Published work while managers prepare changes.
    const predecessor=(await client.query('select * from schedule_periods where id=$1',[ids.periods['cedar:0']])).rows[0];
    const revision=await insert('schedule_periods',{id:id(),client_id:ids.clients.cedar,planning_month:predecessor.planning_month,lineage_id:predecessor.lineage_id,revision_number:2,parent_period_id:predecessor.id,status:'DRAFT',is_current:false});
    for(const original of (await client.query('select * from schedule_assignments where schedule_period_id=$1',[predecessor.id])).rows) {
      const copy=await insert('schedule_assignments',{id:id(),schedule_period_id:revision,employee_user_id:original.employee_user_id,project_id:original.project_id,location_id:original.location_id,assignment_date:original.assignment_date,start_time:original.start_time,end_time:original.end_time,shared_instruction:original.shared_instruction,copied_from_assignment_id:original.id});
      await insert('assignment_skill_requirements',{id:id(),schedule_assignment_id:copy,skill_id:ids.skills.Documentation});
    }
    for(const [key,status,offset,length] of [['omar','APPROVED',3,1],['cora','PENDING',14,1],['dan','REJECTED',21,0],['dan','CANCELLED',28,0]]) {
      const request=await insert('leave_requests',{id:id(),employee_user_id:userId(key),start_date:dayOffset(baseDate,offset),end_date:dayOffset(baseDate,offset+length),status,private_reason:'Fictional personal leave request; private to its owner and Super Admin.',decision_response:status==='REJECTED'?'Please choose a different date for this fictional demonstration.':null,reviewed_by_user_id:['APPROVED','REJECTED'].includes(status)?userId('nora'):null,decided_at:['APPROVED','REJECTED'].includes(status)?new Date():null,cancelled_at:status==='CANCELLED'?new Date():null});
      if(status==='PENDING') await notify('nora','leave.submitted','leave_request',request);
      if(['APPROVED','REJECTED'].includes(status)) await notify(key,`leave.${status.toLowerCase()}`,'leave_request',request);
    }
    for(const [key,offset,intent,admin,candidate] of [['marina',1,'ADD_COVERAGE_ASSIGNMENT','ava','omar'],['vertex',0,'REPLACE_ASSIGNMENT','ben','cora']]) {
      const request=await insert('replacement_requests',{id:id(),intent,status:'PENDING',staffing_requirement_id:ids.rules[key],anchor_assignment_id:ids.anchors[`${key}:${offset}`],requester_user_id:userId(admin),nominated_employee_user_id:userId(candidate),observed_required_employee_count:2,observed_eligible_employee_count:1});
      const thread=await insert('discussion_threads',{id:id(),parent_type:'replacement_request',parent_id:request});
      await insert('discussion_messages',{id:id(),thread_id:thread,author_user_id:userId(admin),content:'Fictional coordination request: please review the work interval and recorded skills before deciding.'});
      await insert('discussion_messages',{id:id(),thread_id:thread,author_user_id:userId(candidate),content:'I have reviewed the proposed demonstration interval. Ready for the Super Admin decision.'});
      await notify('nora','coverage.replacement_requested','replacement_request',request);
    }
    for(const [key,,,,,skillNames] of workforce.filter(x=>x[2]==='EMPLOYEE')) {
      for(const [kind,title,review,expiry] of [['portfolio','Fictional capability portfolio','unreviewed',null],['supporting_document','Fictional delivery reference','unreviewed',null],['cv','Demonstration professional profile','unreviewed',null],['certification',`${skillNames[0]} — fictional credential`,key==='cora'?'verified':key==='dan'?'reviewed':'unreviewed',key==='leila'?null:key==='omar'?dayOffset(baseDate,-7):key==='samira'?dayOffset(baseDate,14):dayOffset(baseDate,180)],['project_example','Fictional delivery handover','unreviewed',null]]) {
        const evidence=await insert('employee_evidence',{id:id(),owner_user_id:userId(key),uploader_user_id:userId(key),kind,title,issuer:kind==='certification'?'Fictional Training Institute':null,issue_date:kind==='certification'?dayOffset(baseDate,-365):null,expiry_date:expiry,related_skill_id:kind==='certification'?ids.skills[skillNames[0]]:null,review_state:review,last_submitted_at:new Date(),reviewed_by_user_id:review!=='unreviewed'?userId('nora'):null,reviewed_at:review!=='unreviewed'?new Date():null,verified_by_user_id:review==='verified'?userId('nora'):null,verified_at:review==='verified'?new Date():null,details:`Fictional ${kind.replaceAll('_',' ')} for feature exploration. Certifications do not imply recorded skill eligibility.`});
        if(kind==='certification') await notify('nora','evidence.created','employee_evidence',evidence);
      }
      await insert('employee_management_notes',{id:id(),subject_user_id:userId(key),author_user_id:userId(key==='cora'?'ava':'ben'),author_role:'ADMIN',visibility:'private_to_author',content:'Fictional private preparation note; never employee-visible.'});
    }
    await insert('employee_management_notes',{id:id(),subject_user_id:userId('cora'),author_user_id:userId('ava'),author_role:'ADMIN',visibility:'shared_upward',content:'Fictional shared-upward note: plan a future documentation workshop.'});
    await audit(marker,'demo_workspace','company-demo-v2',{baseDate,datasetVersion:2,fictional:true,workforceCount:7});
    const proof=await validateCompanyDemo(client);
    if(dryRun) await client.query('rollback'); else await client.query('commit');
    return {status:dryRun?'dry-run':'initialized',baseDate,...proof};
  } catch(error) {await client.query('rollback').catch(()=>{});throw error;} finally {await client.end();}
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await seedCompanyDemo(process.env.DATABASE_URL,{baseDate:process.env.SCOPEIS_DEMO_BASE_DATE,pepper:process.env.AUTH_PASSWORD_PEPPER,password:process.env.SCOPEIS_DEMO_PASSWORD,dryRun:!process.argv.includes('--apply')}),null,2)); }
  catch { console.error('Company demo initialization refused or failed. No credentials are printed.'); process.exitCode=1; }
}
