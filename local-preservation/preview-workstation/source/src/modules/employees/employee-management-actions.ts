"use server";

import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/modules/auth/session-service";
import { EmployeeDomainError } from "@/modules/employees/domain-error";
import { employeeProfileService } from "@/modules/employees/employee-services";

export type EmployeeMutationState = { error?: string; success?: string };
export type EmployeeMutationAction = (state: EmployeeMutationState, formData: FormData) => Promise<EmployeeMutationState>;

function text(formData: FormData, key: string) { const value = formData.get(key); return typeof value === "string" ? value : ""; }
function nullable(formData: FormData, key: string) { const value = text(formData, key).trim(); return value || null; }
function version(formData: FormData) { return Number(text(formData, "expectedVersion")); }
function target(formData: FormData) { return text(formData, "userId"); }
function onlyContains(formData: FormData, allowed: string[]) { return [...formData.keys()].every((key) => allowed.includes(key) || key.startsWith("$ACTION_")); }
function message(error: unknown) {
  if (error instanceof EmployeeDomainError) {
    if (error.code === "STALE_VERSION") return "This record changed. Reload and try again.";
    if (error.code === "FORBIDDEN") return "You are not authorized to change this employee.";
    if (error.code === "CONFLICT") return "This change conflicts with the current employee record.";
    if (error.code === "INVALID_MANAGER") return "Choose a valid active manager without creating a reporting cycle.";
    if (error.code === "VALIDATION_ERROR") return "Check the submitted values and try again.";
  }
  return "The employee change could not be saved. Please try again.";
}
async function actorOrState() { return getCurrentActor(); }
function refresh(userId: string) { revalidatePath(`/employees/${userId}`); revalidatePath("/employees"); }

export const updateEmployeeBasicAction: EmployeeMutationAction = async (_state, formData) => {
  const actor = await actorOrState(); if (!actor) return { error: "Your session has expired. Sign in again." };
  const userId = target(formData);
  try {
    if (!onlyContains(formData, ["userId", "expectedVersion", "displayName", "workEmail", "workPhone", "professionalSummary"])) return { error: "Employee code and management assignments cannot be changed from this form." };
    await employeeProfileService.updateBasicProfile(actor, userId, { expectedVersion: version(formData), displayName: text(formData, "displayName"), workEmail: nullable(formData, "workEmail"), workPhone: nullable(formData, "workPhone"), professionalSummary: nullable(formData, "professionalSummary") });
    refresh(userId); return { success: "Basic employee information saved." };
  } catch (error) { return { error: message(error) }; }
};

export const updateEmployeeAssignmentsAction: EmployeeMutationAction = async (_state, formData) => {
  const actor = await actorOrState(); if (!actor) return { error: "Your session has expired. Sign in again." };
  const userId = target(formData);
  try {
    await employeeProfileService.updateManagementAssignments(actor, userId, { expectedVersion: version(formData), designationId: nullable(formData, "designationId"), managerUserId: nullable(formData, "managerUserId"), team: nullable(formData, "team"), workingPattern: nullable(formData, "workingPattern") });
    refresh(userId); return { success: "Employee assignments saved." };
  } catch (error) { return { error: message(error) }; }
};

export const updateEmployeeRoleAction: EmployeeMutationAction = async (_state, formData) => {
  const actor = await actorOrState(); if (!actor) return { error: "Your session has expired. Sign in again." };
  const userId = target(formData);
  try { await employeeProfileService.updateEmployeeRole(actor, userId, { expectedVersion: version(formData), role: text(formData, "role") as "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE" }); refresh(userId); return { success: "System role saved. Existing sessions were revoked." }; } catch (error) { return { error: message(error) }; }
};

export const setEmployeeLifecycleAction: EmployeeMutationAction = async (_state, formData) => {
  const actor = await actorOrState(); if (!actor) return { error: "Your session has expired. Sign in again." };
  const userId = target(formData); const active = text(formData, "active") === "true";
  try { await employeeProfileService.setEmployeeActive(actor, userId, version(formData), active); refresh(userId); return { success: active ? "Employee reactivated." : "Employee deactivated and active sessions revoked." }; } catch (error) { return { error: message(error) }; }
};

export const updateOwnProfileAction: EmployeeMutationAction = async (_state, formData) => {
  const actor = await actorOrState(); if (!actor) return { error: "Your session has expired. Sign in again." };
  if (!onlyContains(formData, ["expectedVersion", "workEmail", "workPhone", "professionalSummary"])) return { error: "That request included protected profile fields and was rejected." };
  try { await employeeProfileService.updateOwnProfile(actor, actor.id, { expectedVersion: version(formData), workEmail: nullable(formData, "workEmail"), workPhone: nullable(formData, "workPhone"), professionalSummary: nullable(formData, "professionalSummary") }); return { success: "Your profile changes were saved." }; } catch (error) { return { error: message(error) }; }
};

export const grantAdminScopeAction: EmployeeMutationAction = async (_state, formData) => {
  const actor = await actorOrState(); if (!actor) return { error: "Your session has expired. Sign in again." };
  const userId = target(formData);
  try { await employeeProfileService.grantAdminTeamScope(actor, { adminUserId: userId, team: text(formData, "team") }); refresh(userId); return { success: "TEAM scope grant added." }; } catch (error) { return { error: message(error) }; }
};

export const revokeAdminScopeAction: EmployeeMutationAction = async (_state, formData) => {
  const actor = await actorOrState(); if (!actor) return { error: "Your session has expired. Sign in again." };
  const userId = target(formData);
  try { await employeeProfileService.revokeAdminTeamScope(actor, text(formData, "grantId"), version(formData)); refresh(userId); return { success: "TEAM scope grant revoked." }; } catch (error) { return { error: message(error) }; }
};
