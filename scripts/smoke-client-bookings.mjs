import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { chromium } from "@playwright/test";
import { withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { allocateLoopbackPort } from "./phase1-test-environment.mjs";
const folder = "DOCX/phase-reports/evidence/client-bookings-2026-10-16";
await mkdir(folder,{recursive:true});
const checks = [];
function check(value,label){if(!value)throw Error(label);checks.push(label);console.log(label);}
await withDisposableTestDatabase("client_booking_smoke",async({databaseUrl,env})=>{
  const client=new pg.Client({connectionString:databaseUrl});client.on("error",()=>{});await client.connect();
  try {
  const clientId="10000000-0000-4000-8000-000000000091";
  await client.query("insert into clients(id,company_name) values($1,'Outsource smoke client')",[clientId]);
  await client.query("update employee_profiles set team='team:alpha' where user_id='mock-employee-dan'");
  await client.query("insert into admin_scope_grants(user_id,scope_type,scope_reference) values('mock-admin-ava','CLIENT',$1)",[clientId]);
  Object.assign(process.env,env);
  const {outsourcingService,BookingError}=await import("../src/modules/outsourcing/service.ts");
  const {getTimetable}=await import("../src/modules/scheduling/timetable-service.ts");
  const actor=(id,role)=>({id,role,displayName:id,sessionVersion:1,sessionId:"smoke",authenticationMode:"mock",scopes:[]});
  const admin=actor("mock-admin-ava","ADMIN");const employee=actor("mock-employee-cora","EMPLOYEE");
  const data={clientId,employeeIds:["mock-employee-cora","mock-employee-dan"],startDate:"2027-01-30",endDate:"2027-02-02",note:"Smoke booking"};
  const created=await outsourcingService.create(admin,data);
  check(created.length===2,"Scoped Admin books two employees to the same client atomically");
  check((await getTimetable(admin,"2027-01")).filter(e=>e.bookingId).length===4,"January timetable includes both weekend days for both employees");
  check((await getTimetable(employee,"2027-02")).filter(e=>e.bookingId).length===2,"Employee sees only own cross-month booking");
  for(const [who,input,label] of [[admin,data,"Overlapping booking refused"],[employee,data,"Employee booking creation refused"],[actor("mock-admin-ben","ADMIN"),data,"Out-of-scope Admin booking refused"]]){
    let denied=false;try{await outsourcingService.create(who,input);}catch(error){if(!(error instanceof BookingError))throw error;denied=true;}check(denied,label);
  }
  const port=await allocateLoopbackPort();const base=`http://127.0.0.1:${port}`;
  const buildDir=await mkdtemp(join(tmpdir(),"scopeis-phase2-safe-build-"));
  const log=[];
  const server=spawn(process.execPath,["scripts/run-phase2-safe-build.mjs","--serve-port",String(port)],{env:{...env,SCOPEIS_SAFE_BUILD_DIRECTORY:buildDir},windowsHide:true,stdio:["ignore","pipe","pipe"]});
  for(const stream of [server.stdout,server.stderr])stream.on("data",d=>{log.push(d.toString());process.stdout.write(d);});
  let browser;
  try{
    const deadline=Date.now()+240000;let ready=false;
    while(Date.now()<deadline){if(server.exitCode!==null)throw Error("Smoke build/server exited");try{if((await fetch(`${base}/login`)).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
    if(!ready)throw Error("Smoke server did not become ready");
    check(true,"Production build and TypeScript compilation passed");
    browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1280,height:900}});
    const response=await context.request.post(`${base}/api/auth/mock-login`,{data:{personaId:admin.id},headers:{Origin:base}});check(response.ok(),"Normal scoped Admin session established");
    const page=await context.newPage();page.setDefaultTimeout(20000);await page.goto(`${base}/schedule?month=2027-01`);
    await page.getByRole("button",{name:"Book employees to client",exact:true}).click();
    await page.getByRole("dialog").locator("select[name=clientId]").selectOption(clientId);
    await page.getByRole("dialog").getByLabel("Cora Bell",{exact:true}).check();
    await page.getByRole("dialog").getByLabel("Dan Rowan",{exact:true}).check();
    await page.getByLabel("Start date",{exact:true}).fill("2027-03-01");await page.getByLabel("End date",{exact:true}).fill("2027-03-03");
    await page.screenshot({path:join(folder,"admin-booking-form.png"),fullPage:true});
    await page.getByRole("button",{name:"Book employees",exact:true}).click();
    await page.getByText("Employees booked. The client booking is now on their timetable.",{exact:true}).waitFor();
    check(true,"Real multi-select booking form submits successfully");
    await page.getByRole("dialog").getByRole("link",{name:"View timetable",exact:true}).click();
    await page.waitForURL(`**/schedule?month=2027-03`);
    await page.getByRole("heading",{name:"March 2027",exact:true}).waitFor();
    await page.getByRole("button",{name:"Agenda",exact:true}).click();await page.getByText("Outsourced to client · Booked",{exact:true}).first().waitFor();
    await page.screenshot({path:join(folder,"admin-timetable.png"),fullPage:true});
    check(true,"Created booking appears in the timetable Agenda");
    await page.goto(`${base}/clients/${clientId}`);await page.locator("#client-bookings").getByRole("button",{name:"Cancel booking",exact:true}).first().click();
    await page.getByRole("dialog").getByRole("button",{name:"Cancel booking",exact:true}).click();
    await page.getByText("Booking cancelled. These dates are available again.",{exact:true}).first().waitFor();
    check(true,"Real cancellation form releases a booking");
    await context.close();
    check((await client.query("select count(*)::int as n from client_bookings where cancelled_at is not null")).rows[0].n===1,"Cancellation retains its stored record");
    await writeFile(join(folder,"smoke.json"),JSON.stringify({completedAt:new Date().toISOString(),checks,scope:"bounded smoke only; no unit, integration, regression or full-system suites"},null,2)+"\n");
  }finally{
    if(browser)await browser.close();
    if(server.exitCode===null){server.kill("SIGTERM");await once(server,"exit");}
    await writeFile(join(folder,"build-smoke.log"),log.join(""));

  }
  } finally { await client.end(); if(globalThis.scopeisPool)await globalThis.scopeisPool.end(); }
},{phase1EmployeeProfiles:true});
