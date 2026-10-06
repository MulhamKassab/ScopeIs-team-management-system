import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {assertDemoTarget} from './seed-company-demo.mjs';

import {fictionalPdf} from './company-demo-pdf.mjs';

/** Explicitly invoked hosted sample attachment initialization. */

assertDemoTarget(process.env.DATABASE_URL);
if(process.env.EVIDENCE_STORAGE_MODE!=='vercel'||!process.env.BLOB_READ_WRITE_TOKEN)throw new Error('Private hosted file storage is required.');
const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();
let uploaded=0,existing=0;
try {
  if(!(await c.query("select 1 from audit_events where action='demo.company.initialized'")).rowCount)throw new Error('Company demo has not been initialized.');
  const {evidenceService}=await import('../src/modules/evidence/service.ts');const {db}=await import('../src/db/client/index.ts');
  try {
    for(const key of ['cora','dan']) {
      const u=(await c.query('select * from users where id=$1',[`mock-employee-${key}`])).rows[0];
      const actor={id:u.id,displayName:u.display_name,role:u.role,scopes:[],sessionId:randomUUID(),sessionVersion:u.session_version,authenticationMode:'password'};
      for(const kind of ['cv','supporting_document']) {
        const e=(await c.query('select * from employee_evidence where owner_user_id=$1 and kind=$2 and archived_at is null',[u.id,kind])).rows[0];
        if((await c.query('select 1 from employee_files where evidence_id=$1 and archived_at is null',[e.id])).rowCount){existing++;continue;}
        await evidenceService.attachFile(actor,{evidenceId:e.id,expectedVersion:e.version,filename:`fictional-${u.display_name.toLowerCase()}-${kind.replaceAll('_','-')}.pdf`,contentType:'application/pdf',bytes:fictionalPdf(u.display_name,kind)});uploaded++;
      }
    }
  } finally {await db.$client.end();}
  console.log(JSON.stringify({privateFilesUploaded:uploaded,existingFilesPreserved:existing}));
} finally {await c.end();}
