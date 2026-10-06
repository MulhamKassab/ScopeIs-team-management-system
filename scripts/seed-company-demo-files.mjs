import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {assertDemoTarget} from './seed-company-demo.mjs';

/** Small, valid PDF containing only explicitly fictional demonstration text. */
function fictionalPdf(name,kind) {
  const lines=['ScopeIs - Fictional Company Demonstration',`${name} - ${kind.replaceAll('_',' ')}`,'This sample contains fictional professional information.','Use this document to explore authorized preview and download.','No certification, employment or capability claim is implied.'];
  const text=lines.map((line,i)=>`BT /F1 ${i===0?18:12} Tf 50 ${750-i*35} Td (${line.replace(/[\\()]/g,'\\$&')}) Tj ET`).join('\n');
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`];
  let body='%PDF-1.4\n';const offsets=[0];for(const [i,obj] of objects.entries()){offsets.push(Buffer.byteLength(body));body+=`${i+1} 0 obj\n${obj}\nendobj\n`;}
  const xref=Buffer.byteLength(body);body+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(x=>`${String(x).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return new Uint8Array(Buffer.from(body));
}
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
        await evidenceService.attachFile(actor,{evidenceId:e.id,expectedVersion:e.version,filename:`fictional-${key}-${kind.replaceAll('_','-')}.pdf`,contentType:'application/pdf',bytes:fictionalPdf(u.display_name,kind)});uploaded++;
      }
    }
  } finally {await db.$client.end();}
  console.log(JSON.stringify({privateFilesUploaded:uploaded,existingFilesPreserved:existing}));
} finally {await c.end();}
