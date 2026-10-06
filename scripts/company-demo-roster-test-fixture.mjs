import {randomUUID} from 'node:crypto';
import {removedSampleKeys} from './update-company-demo-roster.mjs';
import {userId,workforce,businesses,dayOffset} from './company-demo-data.mjs';

/** Disposable-test-only reconstruction of the v1 references, without hosted data or secrets. */
export async function legacyRosterFixture(c,baseDate) {
  await c.query("update audit_events set metadata=jsonb_set(metadata,'{datasetVersion}','1') where action='demo.company.initialized'");
  for(const [index,key] of removedSampleKeys.entries()) {
    await c.query("insert into users(id,display_name,role,active) values($1,$2,'EMPLOYEE',$3)",[userId(key),`Old sample ${key}`,key!=='sophia']);
    await c.query("insert into employee_profiles(user_id,employee_code,team,manager_user_id) values($1,$2,'team:alpha',$3)",[userId(key),String(100+index).padStart(4,'0'),userId('ava')]);
    await c.query('insert into employee_planning_locations(employee_user_id,latitude,longitude) values($1,25.18,55.26)',[userId(key)]);
    await c.query('insert into employee_skills(id,employee_user_id,skill_id) select $1,$2,id from skills order by name limit 1',[randomUUID(),userId(key)]);
    await c.query("insert into employee_management_notes(id,subject_user_id,author_user_id,author_role,visibility,content) values($1,$2,$3,'ADMIN','private_to_author','Fictional legacy sample note')",[randomUUID(),userId(key),userId('ava')]);
    if(key!=='sophia')for(const kind of ['cv','portfolio','certification','project_example','supporting_document']) {
      const id=randomUUID();
      await c.query('insert into employee_evidence(id,owner_user_id,uploader_user_id,kind,title) values($1,$2,$2,$3,$4)',[id,userId(key),kind,'Fictional legacy sample evidence']);
      if(kind==='certification')await c.query("insert into notifications(id,recipient_user_id,event_type,related_record_type,related_record_id) values($1,$2,'evidence.created','employee_evidence',$3)",[randomUUID(),userId('nora'),id]);
    }
  }
  for(const [key] of workforce.filter(x=>x[0]!=='hanna')) {
    await c.query('update users set display_name=$2 where id=$1',[userId(key),`Old sample ${key}`]);
    await c.query('update user_credentials set username=$2,normalized_username=$2,email=$3,normalized_email=$3 where user_id=$1',[userId(key),key,`${key}@example.test`]);
  }
  await c.query("update admin_scope_grants set scope_reference=case when user_id=$1 then 'team:alpha' else 'team:bravo' end where scope_type='TEAM'",[userId('ava')]);
  for(const [key,name] of businesses) {
    const employee={northstar:'maya',horizon:'rina',marina:'cora',vertex:'omar',crestline:'fatima',cedar:'dan'}[key];
    await c.query("update schedule_assignments a set employee_user_id=$2,start_time='09:00',end_time='13:00' from schedule_periods s join clients cl on cl.id=s.client_id where s.id=a.schedule_period_id and cl.company_name=$1",[name,userId(employee)]);
    await c.query('update operational_employee_relations r set employee_user_id=$2 from projects p join clients cl on cl.id=p.client_id where r.project_id=p.id and cl.company_name=$1',[name,userId(employee)]);
  }
  await c.query("update leave_requests set employee_user_id=$1,start_date=$2,end_date=$3 where status='APPROVED'",[userId('layla'),baseDate,dayOffset(baseDate,1)]);
  await c.query("update leave_requests set employee_user_id=$1 where status='CANCELLED'",[userId('tariq')]);
  for(const [oldKey,newKey] of [['arjun','omar'],['samira','cora']]) {
    await c.query('update replacement_requests set nominated_employee_user_id=$1 where nominated_employee_user_id=$2',[userId(oldKey),userId(newKey)]);
    await c.query('update discussion_messages set author_user_id=$1 where author_user_id=$2',[userId(oldKey),userId(newKey)]);
  }
}
