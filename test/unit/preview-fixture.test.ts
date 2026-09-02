import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assignments, clients, coverageGaps, employeeFor, employees, inScope, leaveRequests, previewConfig, projects,
  selectedPersona, visibleAssignments, visibleEmployees, visibleLeave, visibleNotes,
} from "@/preview/preview-data";

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
});
