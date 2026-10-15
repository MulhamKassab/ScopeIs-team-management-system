"use server";
import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/modules/auth/session-service";
import { EmployeeDomainError } from "@/modules/employees/domain-error";
import { planningLocationService } from "./location-service";

export async function planningLocationAction(_state: { error?: string; success?: string }, data: FormData) {
  const actor = await getCurrentActor(); if (!actor) return { error: "Sign in again to continue." };
  const text = (key: string) => String(data.get(key) ?? "").trim();
  try {
    if ([...data.keys()].some((key) => !["operation", "userId", "expectedProfileVersion", "expectedVersion", "latitude", "longitude"].includes(key) && !key.startsWith("$ACTION_"))) throw new EmployeeDomainError("VALIDATION_ERROR");
    const base = { operation: text("operation"), userId: text("userId"), expectedProfileVersion: Number(text("expectedProfileVersion")), expectedVersion: Number(text("expectedVersion")) };
    if (base.operation === "save" && (!text("latitude") || !text("longitude"))) throw new EmployeeDomainError("VALIDATION_ERROR");
    await planningLocationService.change(actor, base.operation === "save" ? { ...base, latitude: Number(text("latitude")), longitude: Number(text("longitude")) } : base);
    revalidatePath(`/employees/${base.userId}`); revalidatePath("/map");
    return { success: base.operation === "clear" ? "Planning coordinate cleared. Assignments remain available in the list." : "Planning coordinate saved." };
  } catch (error) { return { error: error instanceof EmployeeDomainError ? error.message : "The planning coordinate could not be saved. Reload and try again." }; }
}
