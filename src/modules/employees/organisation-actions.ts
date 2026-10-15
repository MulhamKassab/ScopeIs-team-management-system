"use server";
import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/modules/auth/session-service";
import { EmployeeDomainError } from "./domain-error";
import { organisationService } from "./organisation-service";
import { employeeCatalogueService } from "./employee-services";

export type OrganisationState = { error?: string; success?: string };
function text(data: FormData, key: string) { const value = data.get(key); return typeof value === "string" ? value.trim() : ""; }
export async function organisationAction(_state: OrganisationState, data: FormData): Promise<OrganisationState> {
  const actor = await getCurrentActor(); if (!actor) return { error: "Sign in again to continue." };
  try {
    const kind = text(data, "kind"); const operation = text(data, "operation");
    if (!["team", "designation"].includes(kind) || !["save", "member", "lifecycle"].includes(operation) || [...data.keys()].some((key) => !["kind", "operation", "id", "name", "expectedVersion", "userId", "remove", "active"].includes(key) && !key.startsWith("$ACTION_"))) throw new EmployeeDomainError("VALIDATION_ERROR");
    if (operation === "lifecycle") {
      if (kind !== "designation" || !["true", "false"].includes(text(data, "active"))) throw new EmployeeDomainError("VALIDATION_ERROR");
      await employeeCatalogueService.setDesignationActive(actor, text(data, "id"), Number(text(data, "expectedVersion")), text(data, "active") === "true");
    } else if (operation === "member") await organisationService.setMember(actor, { kind: kind as "team" | "designation", reference: text(data, "id"), userId: text(data, "userId"), expectedVersion: Number(text(data, "expectedVersion")), remove: text(data, "remove") === "true" });
    else { const input = { id: text(data, "id") || undefined, name: text(data, "name"), expectedVersion: Number(text(data, "expectedVersion")) }; if (kind === "team") await organisationService.saveTeam(actor, input); else await organisationService.saveDesignation(actor, input); }
    for (const path of ["/teams", "/designations", "/employees", "/schedule", "/map", "/reports"]) revalidatePath(path, "layout");
    return { success: operation === "lifecycle" ? text(data, "active") === "true" ? "Job title reactivated." : "Job title archived; existing memberships retained." : operation === "member" ? text(data, "remove") === "true" ? "Membership removed." : "Membership saved." : "Saved. This record is available in team and job title options." };
  } catch (error) { return { error: error instanceof EmployeeDomainError ? error.message : "This change could not be saved. Please try again." }; }
}
