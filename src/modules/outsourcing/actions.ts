"use server";
import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/modules/auth/session-service";
import { BookingError, outsourcingService } from "./service";
export type BookingState = { error?: string; success?: string };
function text(data: FormData, key: string) { const value = data.get(key); return typeof value === "string" ? value.trim() : ""; }
async function execute(operation: (actor: NonNullable<Awaited<ReturnType<typeof getCurrentActor>>>) => Promise<unknown>, success: string): Promise<BookingState> {
  try {
    const actor = await getCurrentActor(); if (!actor) return { error: "Your session expired. Sign in again." };
    await operation(actor);
    for (const path of ["/clients", "/schedule", "/coverage", "/leave", "/dashboard"]) revalidatePath(path, "layout");
    return { success };
  } catch (error) { return { error: error instanceof BookingError ? error.message : "The booking could not be saved. Reload and try again." }; }
}
export async function createBookingAction(_state: BookingState, data: FormData) {
  return execute((actor) => outsourcingService.create(actor, { clientId: text(data, "clientId"), employeeIds: data.getAll("employeeIds"), startDate: text(data, "startDate"), endDate: text(data, "endDate"), note: text(data, "note") }), "Employees booked. The client booking is now on their timetable.");
}
export async function cancelBookingAction(_state: BookingState, data: FormData) {
  return execute((actor) => outsourcingService.cancel(actor, { id: text(data, "id"), version: Number(text(data, "version")) }), "Booking cancelled. These dates are available again.");
}
