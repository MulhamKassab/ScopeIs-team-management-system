import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { adminScopeGrants, designations, employeeProfiles, scheduleAssignments, schedulePeriods, users } from "@/db/schema";
import { getTimetable } from "@/modules/scheduling/timetable-service";
import { schedulingService } from "@/modules/scheduling/service";
import { organisationService } from "@/modules/employees/organisation-service";
import { employeeCatalogueService, employeeProfileService } from "@/modules/employees/employee-services";
import { phase3Ids, phase4Ids } from "../../scripts/phase4-test-fixtures.mjs";
import type { AuthenticatedActor } from "@/shared/types/foundation";
const actor = (id: string, role: AuthenticatedActor["role"]): AuthenticatedActor => ({ id, role, displayName: id, sessionId: "test", sessionVersion: 1, scopes: [], authenticationMode: "mock" });
const superAdmin=actor("mock-super-admin-nora","SUPER_ADMIN"), admin=actor("mock-admin-ava","ADMIN"), employee=actor("mock-employee-cora","EMPLOYEE");
const month="2028-08";
beforeAll(async () => {
 for (const status of ["PUBLISHED","DRAFT"] as const) {
  const [period]=await db.insert(schedulePeriods).values({ clientId:phase3Ids.alphaClient,planningMonth:`${month}-01`,lineageId:randomUUID(),revisionNumber:status==="PUBLISHED"?1:2,status,isCurrent:status==="PUBLISHED" }).returning();
  for(const employeeUserId of [employee.id,phase4Ids.bravoEmployee]) await db.insert(scheduleAssignments).values({ schedulePeriodId:period.id,employeeUserId,projectId:phase3Ids.alphaProjectOne,locationId:phase3Ids.alphaLocation,assignmentDate:`${month}-09`,startTime:"09:00",endTime:"11:00",sharedInstruction:"Inspect network" });
 }
});
describe("monthly timetable permissions and organisation management", () => {
 it("keeps Published schedule details within the same TEAM and operational intersection as the timetable", async () => {
  const [period] = await db.select().from(schedulePeriods).where(and(eq(schedulePeriods.planningMonth, `${month}-01`), eq(schedulePeriods.status, "PUBLISHED"), eq(schedulePeriods.isCurrent, true)));
  expect((await schedulingService.getPeriodEditor(superAdmin, period.id)).assignments).toHaveLength(2);
  const scoped = await schedulingService.getPeriodEditor(admin, period.id);
  expect(scoped.assignments.map(row=>row.assignment.employeeUserId)).toEqual([employee.id]);
  expect(JSON.stringify(scoped.assignments)).not.toContain(phase4Ids.bravoEmployee);
  const [grant] = await db.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, admin.id), eq(adminScopeGrants.scopeType, "TEAM"))).limit(1);
  await db.update(adminScopeGrants).set({ active: false }).where(eq(adminScopeGrants.id, grant.id));
  try { expect((await schedulingService.getPeriodEditor(admin, period.id)).assignments).toEqual([]); }
  finally { await db.update(adminScopeGrants).set({ active: true }).where(eq(adminScopeGrants.id, grant.id)); }
 });
 it("projects only current Published work, separates plans and restricts employees to themselves", async () => {
  const published=await getTimetable(superAdmin,month); expect(published).toHaveLength(2); expect(published.every(row=>row.status==="PUBLISHED")).toBe(true);
  const plans=await getTimetable(superAdmin,month,true); expect(plans).toHaveLength(2); expect(plans.every(row=>row.status==="DRAFT")).toBe(true);
  const own=await getTimetable(employee,month,true); expect(own).toHaveLength(1); expect(own[0]).toMatchObject({employeeId:employee.id,status:"PUBLISHED",instruction:"Inspect network",start:"09:00"});
  expect(Object.keys(own[0])).not.toContain("workEmail"); expect(Object.keys(own[0])).not.toContain("team");
 });
 it("requires both TEAM and operational Admin grants and reloads authority each time", async () => {
  expect(await getTimetable(admin,month)).toHaveLength(1);
  const requestedPlans = await getTimetable(admin,month,true);
  expect(requestedPlans).toHaveLength(1);
  expect(requestedPlans.every(row=>row.status === "PUBLISHED")).toBe(true);
  const [grant]=await db.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId,admin.id),eq(adminScopeGrants.scopeType,"TEAM"))).limit(1);
  await db.update(adminScopeGrants).set({active:false}).where(eq(adminScopeGrants.id,grant.id));
  try { expect(await getTimetable(admin,month)).toEqual([]); } finally { await db.update(adminScopeGrants).set({active:true}).where(eq(adminScopeGrants.id,grant.id)); }
  await db.update(users).set({role:"EMPLOYEE"}).where(eq(users.id,admin.id));
  try { expect(await getTimetable(admin,month,true)).toEqual([]); } finally { await db.update(users).set({role:"ADMIN"}).where(eq(users.id,admin.id)); }
 });
 it("creates empty teams, renames stable references and moves/removes membership without granting access", async () => {
  const team=await organisationService.saveTeam(superAdmin,{name:"Field delivery"});
  const original=(await db.select().from(employeeProfiles).where(eq(employeeProfiles.userId,employee.id)))[0];
  const grantsBefore=await db.select().from(adminScopeGrants).where(eq(adminScopeGrants.userId,employee.id));
  await organisationService.setMember(superAdmin,{kind:"team",reference:team.id,userId:employee.id,expectedVersion:original.version,remove:false});
  const moved=(await db.select().from(employeeProfiles).where(eq(employeeProfiles.userId,employee.id)))[0];
  expect(moved).toMatchObject({team:team.id,designationId:original.designationId,managerUserId:original.managerUserId,workingPattern:original.workingPattern});
  expect(await getTimetable(admin,month)).toEqual([]);
  const renamed=await organisationService.saveTeam(superAdmin,{id:team.id,name:"Delivery",expectedVersion:team.version}); expect(renamed.id).toBe(team.id);
  await expect(organisationService.saveTeam(superAdmin,{id:team.id,name:"Stale",expectedVersion:team.version})).rejects.toMatchObject({code:"STALE_VERSION"});
  await organisationService.setMember(superAdmin,{kind:"team",reference:team.id,userId:employee.id,expectedVersion:moved.version,remove:true});
  expect((await db.select().from(employeeProfiles).where(eq(employeeProfiles.userId,employee.id)))[0].team).toBeNull();
  expect(await db.select().from(adminScopeGrants).where(eq(adminScopeGrants.userId,employee.id))).toEqual(grantsBefore);
 });
 it("preserves existing archived titles on unrelated edits and refuses new archived memberships", async () => {
  await organisationService.saveDesignation(superAdmin,{name:"Service engineer"});
  const [designation]=await db.select().from(designations).where(eq(designations.name,"Service engineer"));
  const [profile]=await db.select().from(employeeProfiles).where(eq(employeeProfiles.userId,employee.id));
  await organisationService.setMember(superAdmin,{kind:"designation",reference:designation.id,userId:employee.id,expectedVersion:profile.version,remove:false});
  const [assigned]=await db.select().from(employeeProfiles).where(eq(employeeProfiles.userId,employee.id)); expect(assigned.designationId).toBe(designation.id); expect(assigned.team).toBe(profile.team);
  const archived = await employeeCatalogueService.setDesignationActive(superAdmin,designation.id,designation.version,false);
  const options = await employeeProfileService.listManagementFormOptions(superAdmin,employee.id);
  expect(options.designations).toContainEqual(expect.objectContaining({id:designation.id,name:"Service engineer (archived)"}));
  const preserved = await employeeProfileService.updateManagementAssignments(superAdmin,employee.id,{expectedVersion:assigned.version,designationId:designation.id,team:assigned.team,workingPattern:"Office reference"});
  expect(preserved.designationId).toBe(designation.id);
  const [other] = await db.select().from(employeeProfiles).where(eq(employeeProfiles.userId,phase4Ids.bravoEmployee));
  await expect(organisationService.setMember(superAdmin,{kind:"designation",reference:designation.id,userId:other.userId,expectedVersion:other.version,remove:false})).rejects.toMatchObject({code:"INACTIVE_REFERENCE"});
  await employeeCatalogueService.setDesignationActive(superAdmin,designation.id,archived.version,true);
  await organisationService.setMember(superAdmin,{kind:"designation",reference:designation.id,userId:employee.id,expectedVersion:preserved.version,remove:true});
  expect((await db.select().from(employeeProfiles).where(eq(employeeProfiles.userId,employee.id)))[0].designationId).toBeNull();
 });
 it("rejects forbidden or stale membership operations and concurrent duplicate names", async () => {
  await expect(organisationService.list(admin)).rejects.toMatchObject({code:"FORBIDDEN"});
  await db.update(users).set({role:"ADMIN"}).where(eq(users.id,superAdmin.id));
  try { await expect(organisationService.saveTeam(superAdmin,{name:"Forbidden"})).rejects.toMatchObject({code:"FORBIDDEN"}); } finally { await db.update(users).set({role:"SUPER_ADMIN"}).where(eq(users.id,superAdmin.id)); }
  const duplicate=await Promise.allSettled([organisationService.saveTeam(superAdmin,{name:"Dispatch"}),organisationService.saveTeam(superAdmin,{name:" dispatch "})]); expect(duplicate.filter(item=>item.status==="fulfilled")).toHaveLength(1);
  await expect(organisationService.setMember(superAdmin,{kind:"team",reference:"team:unknown",userId:employee.id,expectedVersion:1,remove:false})).rejects.toMatchObject({code:"VALIDATION_ERROR"});
 });
});
