import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { adminScopeGrants, schedulePeriods, staffingRequirements, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { employeeCatalogueService, employeeSkillService } from "@/modules/employees/employee-services";
import { operationalService } from "@/modules/operations/service";
import { coverageService } from "@/modules/coverage/service";
import { capabilityService } from "@/modules/capabilities/service";
import { CoverageService } from "@/modules/coverage/service";
import { coverageRepository } from "@/modules/coverage/repositories";
import { schedulingService } from "@/modules/scheduling/service";
import { phase3Ids, phase4Ids } from "../../scripts/phase4-test-fixtures.mjs";
import type { AuthenticatedActor } from "@/shared/types/foundation";
const actor = (id: string, role: AuthenticatedActor["role"]): AuthenticatedActor => ({ id, role, displayName: id, sessionId: `s-${id}`, sessionVersion: 1, scopes: [], authenticationMode: "mock" });
const nora = actor("mock-super-admin-nora", "SUPER_ADMIN"), ava = actor("mock-admin-ava", "ADMIN"), cora = actor("mock-employee-cora", "EMPLOYEE"), eli = actor(phase4Ids.alphaEmployee, "EMPLOYEE");

async function conflictFixture(month: string, label: string, anchorEmployee = cora.id) {
  const client = await operationalService.createClient(nora, { companyName: `Conflict checks ${label}` });
  const project = await operationalService.createProject(nora, { clientId: client.id, name: "Support work", status: "ACTIVE" });
  const location = await operationalService.createLocation(nora, { clientId: client.id, name: "Test site", address: "1 Fictional Road" });
  await operationalService.linkProjectLocation(nora, { projectId: project.id, locationId: location.id });
  const skill = await employeeCatalogueService.createSkill(nora, { name: `Conflict skill ${label}` });
  for (const employeeUserId of [cora.id, eli.id, phase4Ids.bravoEmployee]) await employeeSkillService.add(nora, { employeeUserId, skillId: skill.id });
  const rule = await operationalService.addRequirement(nora, { type: "PROJECT", id: project.id, requiredSkillId: skill.id, requiredEmployeeCount: 2 });
  const period = await schedulingService.createPeriod(nora, { clientId: client.id, month });
  const anchor = await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: anchorEmployee, projectId: project.id, locationId: location.id, assignmentDate: `${month}-12`, startTime: "09:00", endTime: "11:00" });
  return { client, project, location, skill, rule, period, anchor };
}

async function publishFixture(f: Awaited<ReturnType<typeof conflictFixture>>) {
  const proposed = await schedulingService.propose(nora, { periodId: f.period.id, expectedVersion: f.period.version + 1 });
  return schedulingService.publish(nora, { periodId: proposed.id, expectedVersion: proposed.version });
}

async function replacementGap(f: Awaited<ReturnType<typeof conflictFixture>>) {
  const skill = await employeeCatalogueService.createSkill(nora, { name: `Qualification ${f.client.companyName}` });
  for (const employeeUserId of [eli.id, phase4Ids.bravoEmployee]) await employeeSkillService.add(nora, { employeeUserId, skillId: skill.id });
  await capabilityService.addAssignmentRequirement(nora, { assignmentId: f.anchor.id, skillId: skill.id });
}

const approve = (request: { id: string; version: number }, selectedEmployeeUserId: string) => coverageService.decide(nora, { replacementRequestId: request.id, expectedVersion: request.version, decision: "APPROVED", selectedEmployeeUserId });

describe("Coverage and support conflict integrity", () => {
  it("serializes duplicate support requests before either can create another review item", async () => {
    const f = await conflictFixture("2042-01", "duplicate requests");
    const results = await Promise.allSettled([eli.id, phase4Ids.bravoEmployee].map((nominatedEmployeeUserId) => coverageService.create(nora, { anchorAssignmentId: f.anchor.id, staffingRequirementId: f.rule.id, intent: "ADD_COVERAGE_ASSIGNMENT", nominatedEmployeeUserId })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toEqual([expect.objectContaining({ reason: expect.objectContaining({ code: "PENDING_REQUEST" }) })]);
  });

  it("rechecks independent gaps under the schedule lock so simultaneous approvals cannot overfill one shortage", async () => {
    const f = await conflictFixture("2042-02", "simultaneous approvals");
    const secondRule = await operationalService.addRequirement(nora, { type: "CLIENT", id: f.client.id, requiredSkillId: f.skill.id, requiredEmployeeCount: 2 });
    const first = await coverageService.create(nora, { anchorAssignmentId: f.anchor.id, staffingRequirementId: f.rule.id, intent: "ADD_COVERAGE_ASSIGNMENT" });
    const second = await coverageService.create(nora, { anchorAssignmentId: f.anchor.id, staffingRequirementId: secondRule.id, intent: "ADD_COVERAGE_ASSIGNMENT" });
    const results = await Promise.allSettled([first, second].map((request, index) => coverageService.decide(nora, { replacementRequestId: request.id, expectedVersion: request.version, decision: "APPROVED", selectedEmployeeUserId: index ? phase4Ids.bravoEmployee : eli.id })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toEqual([expect.objectContaining({ reason: expect.objectContaining({ code: "NO_GAP" }) })]);
    expect((await schedulingService.getPeriodEditor(nora, f.period.id)).assignments).toHaveLength(2);
  });

  it("never offers the anchor person as their own replacement or additional support", async () => {
    const f = await conflictFixture("2042-03", "different person");
    expect((await coverageService.candidates(nora, f.anchor.id)).candidates.map((item) => item.id)).not.toContain(cora.id);
    await expect(coverageService.create(nora, { anchorAssignmentId: f.anchor.id, staffingRequirementId: f.rule.id, intent: "ADD_COVERAGE_ASSIGNMENT", nominatedEmployeeUserId: cora.id })).rejects.toMatchObject({ code: "INELIGIBLE_CANDIDATE" });
    const request = await coverageService.create(nora, { anchorAssignmentId: f.anchor.id, staffingRequirementId: f.rule.id, intent: "REPLACE_ASSIGNMENT" });
    await expect(approve(request, cora.id)).rejects.toMatchObject({ code: "INELIGIBLE_CANDIDATE" });
    expect((await schedulingService.getPeriodEditor(nora, f.period.id)).assignments).toHaveLength(1);
  });

  it("blocks competing replacement requests even when they refer to different qualification gaps", async () => {
    const f = await conflictFixture("2042-04", "duplicate replacements");
    await replacementGap(f);
    await coverageService.create(nora, { anchorAssignmentId: f.anchor.id, intent: "REPLACE_ASSIGNMENT" });
    await expect(coverageService.create(nora, { anchorAssignmentId: f.anchor.id, staffingRequirementId: f.rule.id, intent: "REPLACE_ASSIGNMENT" })).rejects.toMatchObject({ code: "PENDING_REQUEST" });
  });

  it("preserves support when a replacement updates the same Published plan and reuses its one Draft", async () => {
    const f = await conflictFixture("2042-05", "support then replace");
    await replacementGap(f);
    const support = await coverageService.create(nora, { anchorAssignmentId: f.anchor.id, staffingRequirementId: f.rule.id, intent: "ADD_COVERAGE_ASSIGNMENT" });
    const replacement = await coverageService.create(nora, { anchorAssignmentId: f.anchor.id, intent: "REPLACE_ASSIGNMENT" });
    await publishFixture(f);
    const added = await approve(support, eli.id);
    const currentGap = (await coverageService.gaps(nora, f.anchor.id)).find((item) => item.kind === "QUALIFICATION")!;
    expect(currentGap.anchorAssignmentId).not.toBe(f.anchor.id);
    await expect(coverageService.create(nora, { anchorAssignmentId: currentGap.anchorAssignmentId, intent: "REPLACE_ASSIGNMENT" })).rejects.toMatchObject({ code: "PENDING_REQUEST" });
    const replaced = await approve(replacement, phase4Ids.bravoEmployee);
    expect(replaced.effectSchedulePeriodId).toBe(added.effectSchedulePeriodId);
    expect(replaced.effectStatus).toBe("APPLIED_TO_DRAFT");
    const draft = await schedulingService.getPeriodEditor(nora, added.effectSchedulePeriodId!);
    expect(draft.period.status).toBe("DRAFT");
    expect(draft.assignments.map((item) => item.assignment.employeeUserId).sort()).toEqual([eli.id, phase4Ids.bravoEmployee].sort());
    expect((await schedulingService.getPeriodEditor(nora, f.period.id)).assignments[0].assignment.employeeUserId).toBe(cora.id);
    expect(await db.select().from(schedulePeriods).where(and(eq(schedulePeriods.clientId, f.client.id), eq(schedulePeriods.status, "DRAFT")))).toHaveLength(1);
  });

  it("refuses stale support after the original person has already been replaced, while allowing rejection", async () => {
    const f = await conflictFixture("2042-06", "replace then support");
    await replacementGap(f);
    const support = await coverageService.create(nora, { anchorAssignmentId: f.anchor.id, staffingRequirementId: f.rule.id, intent: "ADD_COVERAGE_ASSIGNMENT" });
    const replacement = await coverageService.create(nora, { anchorAssignmentId: f.anchor.id, intent: "REPLACE_ASSIGNMENT" });
    await publishFixture(f);
    const replaced = await approve(replacement, phase4Ids.bravoEmployee);
    await expect(approve(support, eli.id)).rejects.toMatchObject({ code: "STALE_WORK" });
    expect((await coverageRepository.request(db, support.id))?.status).toBe("PENDING");
    expect((await schedulingService.getPeriodEditor(nora, replaced.effectSchedulePeriodId!)).assignments).toHaveLength(1);
    await expect(coverageService.decide(nora, { replacementRequestId: support.id, expectedVersion: support.version, decision: "REJECTED" })).resolves.toMatchObject({ status: "REJECTED" });
  });

  it("refuses a pending request after a manager changes its work times", async () => {
    const f = await conflictFixture("2042-07", "edited work");
    const request = await coverageService.create(nora, { anchorAssignmentId: f.anchor.id, staffingRequirementId: f.rule.id, intent: "ADD_COVERAGE_ASSIGNMENT" });
    await schedulingService.updateAssignment(nora, { assignmentId: f.anchor.id, periodId: f.period.id, expectedVersion: f.anchor.version, expectedPeriodVersion: f.period.version + 1, employeeUserId: cora.id, projectId: f.project.id, locationId: f.location.id, assignmentDate: f.anchor.assignmentDate, startTime: "10:00", endTime: "12:00" });
    await expect(approve(request, eli.id)).rejects.toMatchObject({ code: "STALE_WORK" });
    expect((await schedulingService.getPeriodEditor(nora, f.period.id)).assignments).toHaveLength(1);
  });

  it("shares employee-time locks with manual scheduling across different clients", async () => {
    const coverage = await conflictFixture("2042-08", "cover versus manual");
    const manual = await conflictFixture("2042-08", "manual versus cover", phase4Ids.bravoEmployee);
    const request = await coverageService.create(nora, { anchorAssignmentId: coverage.anchor.id, staffingRequirementId: coverage.rule.id, intent: "ADD_COVERAGE_ASSIGNMENT" });
    const results = await Promise.allSettled([
      approve(request, eli.id),
      schedulingService.addAssignment(nora, { periodId: manual.period.id, expectedPeriodVersion: manual.period.version + 1, employeeUserId: eli.id, projectId: manual.project.id, locationId: manual.location.id, assignmentDate: manual.anchor.assignmentDate, startTime: "10:00", endTime: "12:00" }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failure = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(["OVERLAP", "INELIGIBLE_CANDIDATE"]).toContain(failure.reason.code);
    const editors = await Promise.all([coverage, manual].map((f) => schedulingService.getPeriodEditor(nora, f.period.id)));
    expect(editors.flatMap((editor) => editor.assignments).filter((item) => item.assignment.employeeUserId === eli.id)).toHaveLength(1);
  });

  it("allows adjacent work after support ends without treating it as an overlap", async () => {
    const f = await conflictFixture("2042-09", "adjacent intervals");
    const request = await coverageService.create(nora, { anchorAssignmentId: f.anchor.id, staffingRequirementId: f.rule.id, intent: "ADD_COVERAGE_ASSIGNMENT" });
    await approve(request, eli.id);
    const editor = await schedulingService.getPeriodEditor(nora, f.period.id);
    await expect(schedulingService.addAssignment(nora, { periodId: f.period.id, expectedPeriodVersion: editor.period.version, employeeUserId: eli.id, projectId: f.project.id, locationId: f.location.id, assignmentDate: f.anchor.assignmentDate, startTime: "11:00", endTime: "13:00" })).resolves.toMatchObject({ employeeUserId: eli.id });
  });

  it("rolls back the entire approval, Draft revision and assignments when notification persistence fails", async () => {
    const f = await conflictFixture("2042-10", "approval rollback");
    const request = await coverageService.create(nora, { anchorAssignmentId: f.anchor.id, staffingRequirementId: f.rule.id, intent: "ADD_COVERAGE_ASSIGNMENT" });
    await publishFixture(f);
    const failing = new CoverageService(undefined, async () => { throw new Error("forced approval notification failure"); });
    await expect(failing.decide(nora, { replacementRequestId: request.id, expectedVersion: request.version, decision: "APPROVED", selectedEmployeeUserId: eli.id })).rejects.toThrow("forced approval notification failure");
    expect((await coverageRepository.request(db, request.id))?.status).toBe("PENDING");
    expect((await schedulingService.getPeriodEditor(nora, f.period.id)).assignments).toHaveLength(1);
    expect(await db.select().from(schedulePeriods).where(and(eq(schedulePeriods.clientId, f.client.id), eq(schedulePeriods.status, "DRAFT")))).toHaveLength(0);
  });

  it("handles approval racing publication of an existing revision without deadlock or a second Draft", async () => {
    const f = await conflictFixture("2042-11", "publication race");
    const request = await coverageService.create(nora, { anchorAssignmentId: f.anchor.id, staffingRequirementId: f.rule.id, intent: "ADD_COVERAGE_ASSIGNMENT" });
    const published = await publishFixture(f);
    const revision = await schedulingService.createRevision(nora, { periodId: published.id, expectedVersion: published.version });
    const proposed = await schedulingService.propose(nora, { periodId: revision.id, expectedVersion: revision.version });
    const results = await Promise.allSettled([approve(request, eli.id), schedulingService.publish(nora, { periodId: proposed.id, expectedVersion: proposed.version })]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failure = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(["STALE_WORK", "STALE_VERSION", "INVALID_STATE"]).toContain(failure.reason.code);
    const periods = await db.select().from(schedulePeriods).where(eq(schedulePeriods.clientId, f.client.id));
    expect(periods).toHaveLength(2);
    expect(periods.filter((period) => period.status === "PUBLISHED" && period.isCurrent)).toHaveLength(1);
  });

  it("uses the same lock order as publication when adjacent work belongs to another client", async () => {
    const coverage = await conflictFixture("2042-12", "cover beside publication");
    const adjacent = await conflictFixture("2042-12", "publication beside cover", phase4Ids.bravoEmployee);
    const extra = await schedulingService.addAssignment(nora, { periodId: adjacent.period.id, expectedPeriodVersion: adjacent.period.version + 1, employeeUserId: eli.id, projectId: adjacent.project.id, locationId: adjacent.location.id, assignmentDate: adjacent.anchor.assignmentDate, startTime: "11:00", endTime: "13:00" });
    expect(extra.employeeUserId).toBe(eli.id);
    const proposed = await schedulingService.propose(nora, { periodId: adjacent.period.id, expectedVersion: adjacent.period.version + 2 });
    const request = await coverageService.create(nora, { anchorAssignmentId: coverage.anchor.id, staffingRequirementId: coverage.rule.id, intent: "ADD_COVERAGE_ASSIGNMENT" });
    const results = await Promise.allSettled([approve(request, eli.id), schedulingService.publish(nora, { periodId: proposed.id, expectedVersion: proposed.version })]);
    expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"]);
  });
});
describe("Phase 7 coverage and replacement journey", () => {
  it("keeps independent coverage rules non-blocking and applies an approved add request only to Draft", async () => {
    const skill = await employeeCatalogueService.createSkill(nora, { name: "Phase 7 Coverage Skill" });
    await employeeSkillService.add(nora, { employeeUserId: cora.id, skillId: skill.id }); await employeeSkillService.add(nora, { employeeUserId: eli.id, skillId: skill.id }); const inherited = await db.select().from(staffingRequirements).where(eq(staffingRequirements.projectId, phase3Ids.alphaProjectOne)).then(([row]) => row!); await employeeSkillService.add(nora, { employeeUserId: cora.id, skillId: inherited.requiredSkillId }); await employeeSkillService.add(nora, { employeeUserId: eli.id, skillId: inherited.requiredSkillId });
    const rule = await operationalService.addRequirement(nora, { type: "LOCATION", id: phase3Ids.alphaLocation, requiredSkillId: skill.id, requiredEmployeeCount: 2 });
    const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2027-05" }); const anchor = await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: cora.id, projectId: phase3Ids.alphaProjectOne, locationId: phase3Ids.alphaLocation, assignmentDate: "2027-05-12", startTime: "09:00", endTime: "11:00" });
    const context = await coverageService.assignmentContext(ava, anchor.id); expect(context).toMatchObject({ employeeName: "Cora Bell", clientName: "Alpha Facilities", projectName: "Alpha Modernization", locationName: "Alpha Shared Site", assignmentDate: "2027-05-12", startTime: "09:00", endTime: "11:00" }); expect(Object.keys(context).sort()).toEqual(["id", "periodId", "month", "status", "employeeName", "clientName", "projectName", "locationName", "assignmentDate", "startTime", "endTime"].sort());
    const gaps = await coverageService.gaps(ava, anchor.id); const gap = gaps.find((item) => item.staffingRequirementId === rule.id); expect(gap?.missingEmployeeCount).toBe(1);
    const candidates = await coverageService.candidates(ava, anchor.id); expect(candidates.candidates.map((item) => item.id)).toContain(eli.id); await expect(coverageService.gaps(cora, anchor.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const request = await coverageService.create(ava, { staffingRequirementId: rule.id, anchorAssignmentId: anchor.id, intent: "ADD_COVERAGE_ASSIGNMENT", nominatedEmployeeUserId: eli.id }); expect(request.status).toBe("PENDING");
    const approved = await coverageService.decide(nora, { replacementRequestId: request.id, expectedVersion: request.version, decision: "APPROVED", selectedEmployeeUserId: eli.id }); expect(approved.effectStatus).toBe("APPLIED_TO_DRAFT"); expect((await schedulingService.getPeriodEditor(nora, period.id)).assignments).toHaveLength(2);
    await expect(coverageService.decide(nora, { replacementRequestId: request.id, expectedVersion: request.version, decision: "APPROVED", selectedEmployeeUserId: eli.id })).rejects.toMatchObject({ code: "STALE_VERSION" });
  });
  it("requires Super Admin decision authority and never lets a replacement publish a schedule", async () => { const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2027-06" }); const anchor = await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: cora.id, projectId: phase3Ids.alphaProjectOne, locationId: phase3Ids.alphaLocation, assignmentDate: "2027-06-12", startTime: "09:00", endTime: "11:00" }); const missing = await employeeCatalogueService.createSkill(nora, { name: "Phase 7 Direct Gap" }); await capabilityService.addAssignmentRequirement(nora, { assignmentId: anchor.id, skillId: missing.id }); const request = await coverageService.create(ava, { anchorAssignmentId: anchor.id, intent: "REPLACE_ASSIGNMENT" }); await expect(coverageService.decide(ava, { replacementRequestId: request.id, expectedVersion: request.version, decision: "REJECTED" })).rejects.toMatchObject({ code: "FORBIDDEN" }); expect((await db.select().from((await import("@/db/schema")).schedulePeriods).where((await import("drizzle-orm")).eq((await import("@/db/schema")).schedulePeriods.id, period.id)))[0]?.status).toBe("DRAFT"); });
  it("returns Proposed to Draft and creates an immutable Draft revision from Published", async () => {
    const proposed = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2027-07" }); const proposedAnchor = await schedulingService.addAssignment(nora, { periodId: proposed.id, expectedPeriodVersion: proposed.version, employeeUserId: cora.id, projectId: phase3Ids.alphaProjectOne, locationId: phase3Ids.alphaLocation, assignmentDate: "2027-07-12", startTime: "09:00", endTime: "11:00" }); const proposedSkill = await employeeCatalogueService.createSkill(nora, { name: "Phase 7 Proposed Skill" }); await employeeSkillService.add(nora, { employeeUserId: eli.id, skillId: proposedSkill.id }); await capabilityService.addAssignmentRequirement(nora, { assignmentId: proposedAnchor.id, skillId: proposedSkill.id }); const proposedRequest = await coverageService.create(ava, { anchorAssignmentId: proposedAnchor.id, intent: "REPLACE_ASSIGNMENT", nominatedEmployeeUserId: eli.id }); const proposedRow = await schedulingService.propose(nora, { periodId: proposed.id, expectedVersion: proposed.version + 1 }); const decidedProposed = await coverageService.decide(nora, { replacementRequestId: proposedRequest.id, expectedVersion: proposedRequest.version, decision: "APPROVED", selectedEmployeeUserId: eli.id }); expect(decidedProposed.effectStatus).toBe("APPLIED_TO_DRAFT"); expect((await schedulingService.getPeriodEditor(nora, proposed.id)).period.status).toBe("DRAFT");
    const published = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2027-08" }); const publishedAnchor = await schedulingService.addAssignment(nora, { periodId: published.id, expectedPeriodVersion: published.version, employeeUserId: cora.id, projectId: phase3Ids.alphaProjectOne, locationId: phase3Ids.alphaLocation, assignmentDate: "2027-08-12", startTime: "09:00", endTime: "11:00" }); const publishedSkill = await employeeCatalogueService.createSkill(nora, { name: "Phase 7 Published Skill" }); await employeeSkillService.add(nora, { employeeUserId: eli.id, skillId: publishedSkill.id }); await capabilityService.addAssignmentRequirement(nora, { assignmentId: publishedAnchor.id, skillId: publishedSkill.id }); const publishedRequest = await coverageService.create(ava, { anchorAssignmentId: publishedAnchor.id, intent: "REPLACE_ASSIGNMENT", nominatedEmployeeUserId: eli.id }); const publishedRow = await schedulingService.publish(nora, { periodId: (await schedulingService.propose(nora, { periodId: published.id, expectedVersion: published.version + 1 })).id, expectedVersion: published.version + 2 }); const decidedPublished = await coverageService.decide(nora, { replacementRequestId: publishedRequest.id, expectedVersion: publishedRequest.version, decision: "APPROVED", selectedEmployeeUserId: eli.id }); expect(decidedPublished.effectStatus).toBe("PUBLISHED_REVISION_CREATED"); expect((await schedulingService.getPeriodEditor(nora, publishedRow.id)).period.status).toBe("PUBLISHED"); expect((await schedulingService.getPeriodEditor(nora, decidedPublished.effectSchedulePeriodId!)).period.status).toBe("DRAFT");
  });
  it("rolls back a request when its required notification write fails", async () => { const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2027-09" }); const anchor = await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: cora.id, projectId: phase3Ids.alphaProjectOne, locationId: phase3Ids.alphaLocation, assignmentDate: "2027-09-12", startTime: "09:00", endTime: "11:00" }); const missing = await employeeCatalogueService.createSkill(nora, { name: "Phase 7 Rollback Skill" }); await capabilityService.addAssignmentRequirement(nora, { assignmentId: anchor.id, skillId: missing.id }); const failing = new CoverageService(undefined, async () => { throw new Error("forced notification failure"); }); await expect(failing.create(ava, { anchorAssignmentId: anchor.id, intent: "REPLACE_ASSIGNMENT" })).rejects.toThrow("forced notification failure"); expect((await coverageRepository.requestsForRequester(db, ava.id)).filter((item) => item.anchorAssignmentId === anchor.id)).toHaveLength(0); });
});

describe("Coverage authorization and employee lifecycle regressions", () => {
  it("requires TEAM visibility of the anchor for gaps, candidates, and requests without nominees", async () => {
    const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2032-01" });
    const anchor = await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: phase4Ids.bravoEmployee, projectId: phase3Ids.alphaProjectOne, locationId: phase3Ids.alphaLocation, assignmentDate: "2032-01-12", startTime: "09:00", endTime: "11:00" });
    await expect(coverageService.assignmentContext(ava, anchor.id)).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await expect(coverageService.assignmentContext(nora, "invalid-id")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(coverageService.gaps(ava, anchor.id)).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await expect(coverageService.candidates(ava, anchor.id)).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await expect(coverageService.create(ava, { anchorAssignmentId: anchor.id, intent: "REPLACE_ASSIGNMENT" })).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    expect((await coverageRepository.requestsForRequester(db, ava.id)).filter((request) => request.anchorAssignmentId === anchor.id)).toHaveLength(0);
    await db.insert(adminScopeGrants).values({ userId: ava.id, scopeType: "TEAM", scopeReference: "team:bravo" });
    try { expect((await coverageService.gaps(ava, anchor.id)).length).toBeGreaterThan(0); }
    finally { await db.delete(adminScopeGrants).where(and(eq(adminScopeGrants.userId, ava.id), eq(adminScopeGrants.scopeType, "TEAM"), eq(adminScopeGrants.scopeReference, "team:bravo"))); }
  });

  it("stops counting an inactive or reassigned-role employee toward staffing", async () => {
    const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2032-02" });
    const anchor = await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: cora.id, projectId: phase3Ids.alphaProjectOne, locationId: phase3Ids.alphaLocation, assignmentDate: "2032-02-12", startTime: "09:00", endTime: "11:00" });
    await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version + 1, employeeUserId: eli.id, projectId: phase3Ids.alphaProjectOne, locationId: phase3Ids.alphaLocation, assignmentDate: "2032-02-12", startTime: "09:00", endTime: "11:00" });
    const rule = await db.select().from(staffingRequirements).where(eq(staffingRequirements.projectId, phase3Ids.alphaProjectOne)).then(([row]) => row!);
    expect((await coverageService.gaps(nora, anchor.id)).find((gap) => gap.staffingRequirementId === rule.id)).toBeUndefined();
    try {
      await db.update(users).set({ active: false }).where(eq(users.id, eli.id));
      expect((await coverageService.gaps(nora, anchor.id)).find((gap) => gap.staffingRequirementId === rule.id)).toMatchObject({ eligibleEmployeeCount: 1, missingEmployeeCount: 1 });
      await db.update(users).set({ active: true, role: "ADMIN" }).where(eq(users.id, eli.id));
      expect((await coverageService.gaps(nora, anchor.id)).find((gap) => gap.staffingRequirementId === rule.id)).toMatchObject({ eligibleEmployeeCount: 1, missingEmployeeCount: 1 });
    } finally { await db.update(users).set({ active: true, role: "EMPLOYEE" }).where(eq(users.id, eli.id)); }
  });
});
