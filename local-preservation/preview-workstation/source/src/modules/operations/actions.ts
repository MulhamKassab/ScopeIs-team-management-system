"use server";

import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/modules/auth/session-service";
import { OperationalDomainError } from "@/modules/operations/domain-error";
import { operationalService } from "@/modules/operations/service";

export type OperationalActionState = { error?: string; success?: string };
export type OperationalAction = (state: OperationalActionState, formData: FormData) => Promise<OperationalActionState>;

function text(data: FormData, key: string) { const value = data.get(key); return typeof value === "string" ? value.trim() : ""; }
function nullable(data: FormData, key: string) { return text(data, key) || null; }
function number(data: FormData, key: string) { return Number(text(data, key)); }
function nullableNumber(data: FormData, key: string) { const value = text(data, key); return value === "" ? null : Number(value); }
function target(data: FormData) { return { type: text(data, "targetType") as "CLIENT" | "PROJECT" | "LOCATION", id: text(data, "targetId") }; }
function only(data: FormData, allowed: string[]) { return [...data.keys()].every((key) => allowed.includes(key) || key.startsWith("$ACTION_")); }
function refresh() { for (const path of ["/clients", "/projects", "/locations"]) revalidatePath(path, "layout"); }
function message(error: unknown) {
  if (error instanceof OperationalDomainError) return error.message;
  return "The operational change could not be saved. Reload and try again.";
}
async function actor() { const current = await getCurrentActor(); if (!current) throw new OperationalDomainError("FORBIDDEN", "Your session expired. Sign in again."); return current; }
async function run(operation: () => Promise<unknown>, success: string): Promise<OperationalActionState> { try { await operation(); refresh(); return { success }; } catch (error) { return { error: message(error) }; } }

export const createClientAction: OperationalAction = async (_state, data) => {
  if (!only(data, ["companyName", "accountManagerUserId", "serviceSummary", "serviceStartDate", "serviceEndDate"])) return { error: "The Client form contained unsupported fields." };
  return run(async () => operationalService.createClient(await actor(), { companyName: text(data, "companyName"), accountManagerUserId: nullable(data, "accountManagerUserId"), serviceSummary: nullable(data, "serviceSummary"), serviceStartDate: nullable(data, "serviceStartDate"), serviceEndDate: nullable(data, "serviceEndDate") }), "Client created.");
};
export const updateClientAction: OperationalAction = async (_state, data) => run(async () => operationalService.updateClient(await actor(), text(data, "clientId"), { expectedVersion: number(data, "expectedVersion"), companyName: text(data, "companyName"), accountManagerUserId: nullable(data, "accountManagerUserId"), serviceSummary: nullable(data, "serviceSummary"), serviceStartDate: nullable(data, "serviceStartDate"), serviceEndDate: nullable(data, "serviceEndDate") }), "Client saved.");
export const setClientLifecycleAction: OperationalAction = async (_state, data) => run(async () => operationalService.setClientArchived(await actor(), text(data, "clientId"), { expectedVersion: number(data, "expectedVersion"), archived: text(data, "archived") === "true" }), text(data, "archived") === "true" ? "Client archived." : "Client reactivated.");

export const createProjectAction: OperationalAction = async (_state, data) => run(async () => operationalService.createProject(await actor(), { clientId: text(data, "clientId"), name: text(data, "name"), status: text(data, "status") || "PLANNED", responsibleAdminUserId: nullable(data, "responsibleAdminUserId"), startDate: nullable(data, "startDate"), endDate: nullable(data, "endDate") }), "Project created.");
export const updateProjectAction: OperationalAction = async (_state, data) => run(async () => operationalService.updateProject(await actor(), text(data, "projectId"), { expectedVersion: number(data, "expectedVersion"), name: text(data, "name"), status: text(data, "status"), responsibleAdminUserId: nullable(data, "responsibleAdminUserId"), startDate: nullable(data, "startDate"), endDate: nullable(data, "endDate") }), "Project saved.");

export const createLocationAction: OperationalAction = async (_state, data) => run(async () => operationalService.createLocation(await actor(), { clientId: text(data, "clientId"), name: text(data, "name"), address: text(data, "address"), latitude: nullableNumber(data, "latitude"), longitude: nullableNumber(data, "longitude"), siteHours: nullable(data, "siteHours"), accessInstructions: nullable(data, "accessInstructions"), visitRequirements: nullable(data, "visitRequirements") }), "Location created. It was not linked automatically.");
export const updateLocationAction: OperationalAction = async (_state, data) => run(async () => operationalService.updateLocation(await actor(), text(data, "locationId"), { expectedVersion: number(data, "expectedVersion"), name: text(data, "name"), address: text(data, "address"), latitude: nullableNumber(data, "latitude"), longitude: nullableNumber(data, "longitude"), siteHours: nullable(data, "siteHours"), accessInstructions: nullable(data, "accessInstructions"), visitRequirements: nullable(data, "visitRequirements") }), "Location saved.");
export const setLocationLifecycleAction: OperationalAction = async (_state, data) => run(async () => operationalService.setLocationArchived(await actor(), text(data, "locationId"), { expectedVersion: number(data, "expectedVersion"), archived: text(data, "archived") === "true" }), text(data, "archived") === "true" ? "Location archived." : "Location reactivated.");

export const linkProjectLocationAction: OperationalAction = async (_state, data) => run(async () => operationalService.linkProjectLocation(await actor(), { projectId: text(data, "projectId"), locationId: text(data, "locationId"), expectedVersion: text(data, "expectedVersion") ? number(data, "expectedVersion") : undefined }), "Location linked deliberately to this Project.");
export const unlinkProjectLocationAction: OperationalAction = async (_state, data) => run(async () => operationalService.unlinkProjectLocation(await actor(), text(data, "projectId"), text(data, "locationId"), number(data, "expectedVersion")), "Project/Location relationship archived.");

export const addContactAction: OperationalAction = async (_state, data) => run(async () => operationalService.addContact(await actor(), { ...target(data), name: text(data, "name"), roleTitle: nullable(data, "roleTitle"), workPhone: nullable(data, "workPhone"), workEmail: nullable(data, "workEmail") }), "Operational contact added.");
export const addRequirementAction: OperationalAction = async (_state, data) => run(async () => operationalService.addRequirement(await actor(), { ...target(data), requiredSkillId: text(data, "requiredSkillId"), requiredEmployeeCount: number(data, "requiredEmployeeCount"), note: nullable(data, "note") }), "Staffing requirement added. No person, shift, or date was assigned.");
export const addEmployeeRelationAction: OperationalAction = async (_state, data) => run(async () => operationalService.addEmployeeRelation(await actor(), { ...target(data), employeeUserId: text(data, "employeeUserId") }), "Operational employee association added. It grants no access and creates no schedule assignment.");
export const addNoteAction: OperationalAction = async (_state, data) => run(async () => operationalService.addNote(await actor(), { ...target(data), content: text(data, "content") }), "Shared operational note added.");
export const updateNoteAction: OperationalAction = async (_state, data) => run(async () => operationalService.updateNote(await actor(), { noteId: text(data, "noteId"), expectedVersion: number(data, "expectedVersion"), content: text(data, "content") }), "Your note was updated.");
export const archiveNoteAction: OperationalAction = async (_state, data) => run(async () => operationalService.archiveNote(await actor(), { noteId: text(data, "noteId"), expectedVersion: number(data, "expectedVersion"), reason: text(data, "reason") }), "Shared note archived with its reason retained for audit.");
export const archiveSupportingAction: OperationalAction = async (_state, data) => run(async () => operationalService.archiveSupporting(await actor(), { kind: text(data, "kind"), id: text(data, "recordId"), expectedVersion: number(data, "expectedVersion") }), "Operational relationship archived.");

export const grantOperationalScopeAction: OperationalAction = async (_state, data) => run(async () => operationalService.grantScope(await actor(), { adminUserId: text(data, "adminUserId"), target: target(data), expectedVersion: text(data, "expectedVersion") ? number(data, "expectedVersion") : undefined }), "Explicit operational scope granted.");
export const revokeOperationalScopeAction: OperationalAction = async (_state, data) => run(async () => operationalService.revokeScope(await actor(), { grantId: text(data, "grantId"), expectedVersion: number(data, "expectedVersion") }), "Operational scope revoked; history retained.");
