import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {loadPhase1TestConfiguration,assertPhase1TestDatabaseSafety} from './phase1-test-environment.mjs';
import {reconcileMigrationState} from './phase2-migration-core.mjs';
import {seedCompanyDemo,assertDemoTarget,validateCompanyDemo} from './seed-company-demo.mjs';
import {verifyPassword} from '../src/modules/auth/password.ts';
const config=await loadPhase1TestConfiguration(); await assertPhase1TestDatabaseSafety(config);
const name=`scopeis_company_demo_${randomUUID().replaceAll('-','').slice(0,12)}_test`;
const url=new URL(config.databaseUrl);url.pathname=`/${name}`;
const parent=new pg.Client({connectionString:config.databaseUrl});await parent.connect();let created=false;
const options={baseDate:'2026-10-06',pepper:'fictional-company-demo-test-pepper-00000000',password:'fictional-demo-test-only',disposableTest:true};
try {
  for(const bad of [config.databaseUrl,'postgresql://scopeis_demo_owner@evil.test/scopeis_company_demo?sslmode=require','postgresql://scopeis_demo_owner@ep-steep-poetry-avl3re9t.c-11.us-east-1.aws.neon.tech/neondb?sslmode=require']) assert.throws(()=>assertDemoTarget(bad,options));
  await parent.query(`create database "${name}"`);created=true;
  await reconcileMigrationState(url.toString(),{allowDisposableTest:true,apply:true});
  const c=new pg.Client({connectionString:url.toString()});await c.connect();
  try {
    await assert.rejects(seedCompanyDemo(url.toString(),{...options,failureAfterWorkforce:true}),/Injected rollback/);
    assert.equal((await c.query('select count(*)::int n from users')).rows[0].n,0);
    const dry=await seedCompanyDemo(url.toString(),{...options,dryRun:true});assert.equal(dry.counts.users,18);
    assert.equal((await c.query('select count(*)::int n from users')).rows[0].n,0);
    await c.query("insert into users(id,display_name,role) values('existing','Existing company','SUPER_ADMIN')");
    await assert.rejects(seedCompanyDemo(url.toString(),options),/existing workspace/);
    await c.query("delete from users where id='existing'");
    const seeded=await seedCompanyDemo(url.toString(),options);assert.equal(seeded.status,'initialized');
    assert.equal(seeded.counts.users,18);assert.equal(seeded.counts.user_credentials,5);assert.equal(seeded.counts.clients,6);assert.equal(seeded.counts.projects,12);
    assert.ok(seeded.counts.employee_skills>=48);assert.equal(seeded.counts.schedule_assignments,57);assert.equal(seeded.counts.employee_evidence,70);
    assert.deepEqual(Object.values(seeded.integrity).map(Number),[0,0,0,0]);
    const credentials=(await c.query('select password_hash from user_credentials')).rows;
    for(const row of credentials) assert.equal(await verifyPassword(options.password,row.password_hash,options.pepper),true);
    await c.query("update operational_notes set content='User edited this note',version=3 where id=(select id from operational_notes limit 1)");
    const unchanged=await seedCompanyDemo(url.toString(),{...options,baseDate:'2026-11-01',password:'different-test-only'});assert.equal(unchanged.status,'unchanged');assert.equal(unchanged.baseDate,options.baseDate);
    assert.equal((await c.query("select count(*)::int n from operational_notes where content='User edited this note'")).rows[0].n,1);
    assert.deepEqual(unchanged.counts,seeded.counts);
    assert.equal((await c.query("select role from users where id='mock-employee-dan'")).rows[0].role,'EMPLOYEE');
    assert.equal((await c.query("select count(*)::int n from admin_scope_grants where user_id='mock-admin-ava' and scope_type='CLIENT'")).rows[0].n,4);
    assert.equal((await c.query("select count(*)::int n from admin_scope_grants where user_id='mock-admin-ben' and scope_type='CLIENT'")).rows[0].n,2);
    // Exercise the same domain services used by protected pages and decision buttons.
    Object.assign(process.env,{DATABASE_URL:url.toString(),APP_ENV:'test',MOCK_AUTH_ENABLED:'false',AUTH_PASSWORD_PEPPER:options.pepper,EVIDENCE_STORAGE_MODE:'local'});
    const {coverageService}=await import('../src/modules/coverage/service.ts');
    const {planningMapService}=await import('../src/modules/maps/service.ts');
    const {reportingService}=await import('../src/modules/reporting/service.ts');
    const {leaveService}=await import('../src/modules/leave/service.ts');
    const {managementNoteService}=await import('../src/modules/notes/service.ts');
    const {discussionService}=await import('../src/modules/discussions/service.ts');
    const {employeeProfileService:employeeService}=await import('../src/modules/employees/employee-services.ts');
    const {db}=await import('../src/db/client/index.ts');
    try {
      const actors={};
      for(const key of ['nora','ava','ben','cora','dan']) {
        const u=(await c.query('select * from users where id like $1',[`%${key}`])).rows[0];
        const scopes=(await c.query('select scope_type as type,scope_reference as reference from admin_scope_grants where user_id=$1 and active',[u.id])).rows;
        actors[key]={id:u.id,displayName:u.display_name,role:u.role,scopes,sessionId:randomUUID(),sessionVersion:1,authenticationMode:'password'};
        assert.ok(await employeeService.getOwnProfile(actors[key]));
        assert.ok((await reportingService.dashboard(actors[key])).cards.length);
      }
      assert.equal((await planningMapService.projection(actors.nora,{date:options.baseDate})).assignments.length,6);
      const avaMap=await planningMapService.projection(actors.ava,{date:options.baseDate});assert.equal(avaMap.assignments.length,4);assert.ok(avaMap.assignments.every(x=>x.employeePrecision==='coarse'));
      await assert.rejects(planningMapService.projection(actors.cora,{date:options.baseDate}));
      assert.ok((await reportingService.report(actors.nora,'published-allocation',{})).rows.length);
      assert.ok((await reportingService.report(actors.nora,'evidence-review-queue',{})).rows.length);
      const unavailable=await leaveService.approvedUnavailabilityForAdmin(actors.ava);assert.equal(unavailable.length,1);assert.ok(!JSON.stringify(unavailable).includes('private'));
      assert.equal((await managementNoteService.listForSubject(actors.nora,actors.cora.id)).notes.length,1);
      await assert.rejects(managementNoteService.listForSubject(actors.cora,actors.cora.id));
      for(const request of (await c.query('select * from replacement_requests order by intent')).rows) {
        const requester=Object.values(actors).find(a=>a.id===request.requester_user_id);
        const candidates=await coverageService.candidates(requester,request.anchor_assignment_id);
        assert.ok(candidates.candidates.some(x=>x.id===request.nominated_employee_user_id));
        assert.ok((await discussionService.openThread(requester,request.id)).messages.length===2);
        await assert.rejects(discussionService.openThread(actors.nora,request.id));
        const decided=await coverageService.decide(actors.nora,{replacementRequestId:request.id,expectedVersion:1,decision:'APPROVED'});
        assert.equal(decided.effectStatus,request.intent==='ADD_COVERAGE_ASSIGNMENT'?'APPLIED_TO_DRAFT':'PUBLISHED_REVISION_CREATED');
      }
    } finally {await db.$client.end();}
    await validateCompanyDemo(c);
    console.log(JSON.stringify({passed:true,checks:['wrong target refusal','atomic rollback','dry run rollback','existing workspace refusal','canonical schema integrity','current dates and lifecycle','real KDF login','idempotence preserves edits and credentials','role and scope boundaries','five profile and dashboard journeys','map publication and coordinate privacy','report populations','leave and note privacy','discussion participant privacy','actionable coverage decisions and published revision preservation'],counts:seeded.counts},null,2));
  } finally {await c.end();}
} finally {
  if(created) await parent.query(`drop database "${name}"`);
  await parent.end();
}
