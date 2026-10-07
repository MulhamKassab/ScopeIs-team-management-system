import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assignments, auditEvents, clients, coverageGaps, dashboardCounts, discussions, employeeFor, employees, fixtureCounts, inScope, leaveRequests,
  locations, notes, notifications, personas, planningCoordinates, previewConfig, projects, replacements,
  selectedPersona, visibleAssignments, visibleDiscussions, visibleEmployees, visibleLeave, visibleNotes,
} from "@/preview/preview-data";
import { mapDates, planningMapAssignments, planningMapWorksites } from "@/preview/preview-map-data";
import { previewRoutes, visiblePreviewRoutes } from "@/preview/preview-routes";
import { capabilityRecords, certifications, coverageEvaluations, historicalLeave, managementHistory, operationalAudit, operationalClients, operationalLocations, operationalNotifications, operationalProjects, operationalRequests, operationalWork, portfolioItems, replacementDecisions, visibleManagementHistory, visibleOperationalLeave } from "@/preview/rich-operational-data";

describe("database-free Preview fixtures", () => {
  it("contains a deterministic, internally consistent fictional graph", () => {
    expect(employees).toHaveLength(18);
    expect(new Set(employees.map((employee) => employee.id)).size).toBe(employees.length);
    expect(employees.every((employee) => !employee.managerId || employeeFor(employee.managerId))).toBe(true);
    expect(projects.every((project) => clients.some((client) => client.id === project.clientId))).toBe(true);
    expect(projects.every((project) => employeeFor(project.leadId))).toBe(true);
    expect(assignments.every((assignment) => employeeFor(assignment.employeeId))).toBe(true);
    expect(assignments.every((assignment) => projects.some((project) => project.id === assignment.projectId))).toBe(true);
    expect(leaveRequests.every((request) => employeeFor(request.employeeId))).toBe(true);
  });

  it("filters records by fixture role and team scope", () => {
    const nora = selectedPersona("nora"); const ava = selectedPersona("ava"); const ben = selectedPersona("ben"); const cora = selectedPersona("cora");
    expect(visibleEmployees(nora)).toHaveLength(18);
    expect(visibleEmployees(ava).every((employee) => employee.team === "alpha")).toBe(true);
    expect(visibleEmployees(ben).every((employee) => employee.team === "bravo")).toBe(true);
    expect(visibleEmployees(cora).map((employee) => employee.id)).toEqual(["emp-cora"]);
    expect(visibleAssignments(cora).every((assignment) => assignment.employeeId === "emp-cora" && assignment.state === "Published")).toBe(true);
    expect(visibleLeave(ava).every((request) => request.team === "alpha" && !("reason" in request))).toBe(true);
    expect(visibleNotes(cora).every((note) => note.scope === "Shared" && note.team === "alpha")).toBe(true);
    expect(inScope(coverageGaps, ben).every((gap) => gap.team === "bravo")).toBe(true);
  });

  it("has no Preview persistence mechanism or active database bootstrap", () => {
    expect(previewConfig.isPersistent).toBe(false);
    const packageJson = readFileSync("package.json", "utf8");
    expect(packageJson).not.toContain("bootstrap-preview-database");
    expect(packageJson).not.toContain("@vercel/blob");
    expect(packageJson).not.toContain("drizzle-orm");
    expect(packageJson).not.toContain('"pg"');
  });

  it("resolves every fixture relationship and uses safe fictional contact details", () => {
    const collections = [employees, clients, projects, locations, assignments, leaveRequests, coverageGaps, replacements, notes, discussions, notifications, auditEvents, planningCoordinates];
    const allIds = collections.flatMap((items) => items.map((item) => item.id));
    expect(new Set(allIds).size).toBe(allIds.length);
    expect(employees.every((employee) => employee.email.endsWith("@example.test") && employee.phone.startsWith("+971 50 000"))).toBe(true);
    expect(clients.every((client) => locations.some((location) => location.id === client.primaryLocationId && location.clientId === client.id))).toBe(true);
    expect(locations.every((location) => clients.some((client) => client.id === location.clientId && client.team === location.team))).toBe(true);
    expect(projects.every((project) => locations.some((location) => location.id === project.locationId && location.team === project.team))).toBe(true);
    expect(assignments.every((assignment) => {
      const project = projects.find((candidate) => candidate.id === assignment.projectId);
      return project?.locationId === assignment.locationId && employeeFor(assignment.employeeId)?.team === project.team;
    })).toBe(true);
    expect(leaveRequests.every((leave) => employeeFor(leave.employeeId)?.team === leave.team)).toBe(true);
    expect(coverageGaps.every((gap) => assignments.some((assignment) => assignment.id === gap.assignmentId) && employeeFor(gap.employeeId)?.team === gap.team)).toBe(true);
    expect(replacements.every((request) => assignments.some((assignment) => assignment.id === request.assignmentId) && employeeFor(request.requestedForId) && request.candidateIds.every(employeeFor))).toBe(true);
    expect(notifications.every((notification) => employeeFor(notification.recipientId))).toBe(true);
    expect(discussions.every((discussion) => discussion.participantIds.every(employeeFor))).toBe(true);
  });

  it("validates hardcoded coordinate bounds, links, published map rows, and scope before map rendering", () => {
    expect(planningCoordinates.every((coordinate) => coordinate.latitude >= -90 && coordinate.latitude <= 90 && coordinate.longitude >= -180 && coordinate.longitude <= 180)).toBe(true);
    expect(planningCoordinates.every((coordinate) => coordinate.entityType === "location" ? locations.some((location) => location.id === coordinate.entityId) : employeeFor(coordinate.entityId))).toBe(true);
    const nora = selectedPersona("nora"); const ava = selectedPersona("ava"); const ben = selectedPersona("ben"); const cora = selectedPersona("cora");
    for (const date of mapDates) {
      expect(planningMapAssignments(nora, date).every((item) => item.date === date)).toBe(true);
      expect(planningMapAssignments(ava, date).every((item) => item.team === "alpha")).toBe(true);
      expect(planningMapAssignments(ben, date).every((item) => item.team === "bravo")).toBe(true);
      expect(planningMapAssignments(cora, date)).toEqual([]);
    }
    expect(planningMapAssignments(nora, "2026-09-18").every((item) => assignments.some((assignment) => assignment.id === item.id && assignment.state === "Published"))).toBe(true);
  });

  it("keeps a dense fixture planning week and route-ready worksite popups internally consistent", () => {
    expect(assignments.length).toBeGreaterThan(80);
    expect(new Set(assignments.map((assignment) => assignment.id)).size).toBe(assignments.length);
    const nora = selectedPersona("nora");
    for (const date of mapDates) {
      const entries = planningMapAssignments(nora, date);
      const worksites = planningMapWorksites(entries);
      expect(entries.length).toBeGreaterThan(4);
      expect(worksites.length).toBeGreaterThan(1);
      expect(worksites.every((worksite) => locations.some((location) => location.id === worksite.locationId))).toBe(true);
      expect(worksites.every((worksite) => projects.some((project) => project.id === worksite.projectId && project.locationId === worksite.locationId))).toBe(true);
      expect(worksites.reduce((count, worksite) => count + worksite.assignmentCount, 0)).toBe(entries.length);
    }
  });

  it("keeps route coverage, role visibility, and private records consistent", () => {
    expect(previewRoutes).toHaveLength(22);
    expect(previewRoutes.every((route) => route.fixtureSurface.length > 0 && route.roles.length > 0)).toBe(true);
    for (const persona of personas) expect(visiblePreviewRoutes(persona).every((route) => route.roles.includes(persona.role))).toBe(true);
    const ava = selectedPersona("ava"); const ben = selectedPersona("ben"); const cora = selectedPersona("cora"); const dan = selectedPersona("dan");
    expect(visibleNotes(ava).every((note) => note.team === "alpha" && note.scope !== "Management private")).toBe(true);
    expect(visibleNotes(ben).every((note) => note.team === "bravo" && note.scope !== "Management private")).toBe(true);
    expect(visibleDiscussions(cora).every((discussion) => discussion.participantIds.includes(cora.employeeId))).toBe(true);
    expect(visibleDiscussions(dan).every((discussion) => discussion.participantIds.includes(dan.employeeId))).toBe(true);
    expect(visiblePreviewRoutes(cora).some((route) => route.href === "/map")).toBe(false);
    expect(visiblePreviewRoutes(cora).some((route) => route.href === "/reports" || route.href === "/audit" || route.href === "/management-notes")).toBe(false);
    expect(visibleAssignments(cora).every((assignment) => assignment.state === "Published")).toBe(true);
    const nora = selectedPersona("nora");
    expect(dashboardCounts(nora).employees).toBe(fixtureCounts.employees);
    expect(dashboardCounts(nora).publishedAssignments).toBe(fixtureCounts.publishedAssignments);
    expect(fixtureCounts.clients).toBe(clients.length);
    expect(fixtureCounts.projects).toBe(projects.length);
    expect(fixtureCounts.coverage).toBe(coverageGaps.length);
  });

  it("keeps the rich multi-year operational fixture graph deterministic and connected", () => {
    expect(operationalClients).toHaveLength(10);
    expect(operationalProjects).toHaveLength(30);
    expect(operationalLocations.length).toBeGreaterThanOrEqual(20);
    expect(capabilityRecords.length).toBeGreaterThanOrEqual(80);
    expect(certifications.length).toBeGreaterThanOrEqual(45);
    expect(portfolioItems.length).toBeGreaterThanOrEqual(60);
    expect(assignments.length).toBeGreaterThanOrEqual(300);
    expect(operationalWork.length).toBeGreaterThanOrEqual(300);
    expect(historicalLeave.length).toBeGreaterThanOrEqual(50);
    expect(operationalRequests.length).toBeGreaterThanOrEqual(75);
    expect(operationalNotifications.length).toBeGreaterThanOrEqual(100);
    expect(operationalAudit.length).toBeGreaterThanOrEqual(100);
    expect(operationalProjects.every((project) => operationalClients.some((client) => client.id === project.clientId && client.team === project.team))).toBe(true);
    expect(operationalLocations.every((location) => operationalProjects.some((project) => project.id === location.projectId && project.clientId === location.clientId))).toBe(true);
    expect(operationalWork.every((work) => operationalProjects.some((project) => project.id === work.projectId && project.clientId === work.clientId) && employeeFor(work.employeeId))).toBe(true);
    expect(operationalRequests.every((request) => operationalProjects.some((project) => project.id === request.projectId) && operationalLocations.some((location) => location.id === request.locationId))).toBe(true);
    expect(replacementDecisions.every((request) => coverageEvaluations.some((coverage) => coverage.id === request.coverageId) && request.candidateIds.every(employeeFor))).toBe(true);
    expect(historicalLeave.every((leave) => employeeFor(leave.employeeId)?.team === leave.team && leave.start <= leave.end)).toBe(true);
    expect(operationalWork.every((work) => !work.id.includes("random"))).toBe(true);
  });

  it("keeps rich leave and management history inside persona privacy boundaries", () => {
    const nora = selectedPersona("nora"); const ava = selectedPersona("ava"); const ben = selectedPersona("ben"); const cora = selectedPersona("cora");
    expect(visibleOperationalLeave(ava).every((leave) => leave.team === "alpha")).toBe(true);
    expect(visibleOperationalLeave(ben).every((leave) => leave.team === "bravo")).toBe(true);
    expect(visibleOperationalLeave(cora).every((leave) => leave.employeeId === cora.employeeId)).toBe(true);
    expect(visibleManagementHistory(nora, "emp-cora")).toEqual(managementHistory.filter((note) => note.subjectId === "emp-cora"));
    expect(visibleManagementHistory(ava, "emp-cora").every((note) => note.authorId === ava.employeeId)).toBe(true);
    expect(visibleManagementHistory(ben, "emp-cora")).toEqual([]);
    expect(visibleManagementHistory(cora, "emp-cora")).toEqual([]);
  });
});
