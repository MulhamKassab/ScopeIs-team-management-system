"use server";
import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/modules/auth/session-service";
import { EmployeeDomainError } from "./domain-error";
import { employeeCatalogueService } from "./employee-services";

export type ArrangementState = { error?: string; success?: string };
export async function arrangementAction(_state: ArrangementState, data: FormData): Promise<ArrangementState> {
  const actor = await getCurrentActor();
  if (actor?.role !== "SUPER_ADMIN") return { error: "Only Super Admin can manage assignment labels." };
  const text = (key: string) => String(data.get(key) ?? "").trim();
  try {
    if ([...data.keys()].some((key) => !["operation", "id", "expectedVersion", "name", "color", "sortOrder", "active"].includes(key) && !key.startsWith("$ACTION_"))) throw new EmployeeDomainError("VALIDATION_ERROR");
    const input = { name: text("name"), color: text("color"), sortOrder: Number(text("sortOrder")) };
    const operation = text("operation");
    if (operation === "create") await employeeCatalogueService.createArrangementLabel(actor, input);
    else if (operation === "update") await employeeCatalogueService.updateArrangementLabel(actor, text("id"), { ...input, expectedVersion: Number(text("expectedVersion")) });
    else if (operation === "lifecycle" && ["true", "false"].includes(text("active"))) await employeeCatalogueService.setArrangementLabelActive(actor, text("id"), Number(text("expectedVersion")), text("active") === "true");
    else throw new EmployeeDomainError("VALIDATION_ERROR");
    revalidatePath("/arrangements");
    return { success: operation === "lifecycle" ? text("active") === "true" ? "Label reactivated." : "Label archived; history retained." : "Label saved." };
  } catch (error) { return { error: error instanceof EmployeeDomainError ? error.message : "The label could not be saved. Reload and try again." }; }
}
