"use server";
import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/modules/auth/session-service";
import { NotificationDomainError } from "@/modules/notifications/domain-error";
import { notificationService } from "@/modules/notifications/service";

export type NotificationActionState = { error?: string; success?: string };
export type NotificationAction = (state: NotificationActionState, data: FormData) => Promise<NotificationActionState>;

const text = (data: FormData, key: string) => typeof data.get(key) === "string" ? String(data.get(key)).trim() : "";
const only = (data: FormData, keys: string[]) => [...data.keys()].every((key) => keys.includes(key) || key.startsWith("$ACTION_"));
const allowed = ["notificationId", "read", "archived"];

async function actor() { const current = await getCurrentActor(); if (!current) throw new NotificationDomainError("VALIDATION_ERROR", "Your session expired. Sign in again."); return current; }
function message(error: unknown) { return error instanceof NotificationDomainError ? error.message : "The notification could not be updated. Reload and try again."; }

async function run(operation: () => Promise<unknown>, success: string) {
  try { await operation(); revalidatePath("/notifications"); return { success }; }
  catch (error) { return { error: message(error) }; }
}

export const setNotificationReadAction: NotificationAction = async (_state, data) => !only(data, allowed) ? { error: "The notification request contained unsupported fields." } : run(
  async () => notificationService.setRead(await actor(), text(data, "notificationId"), text(data, "read") === "true"),
  "Notification read state saved.",
);

export const archiveNotificationAction: NotificationAction = async (_state, data) => !only(data, allowed) ? { error: "The notification request contained unsupported fields." } : run(
  async () => notificationService.setArchived(await actor(), text(data, "notificationId"), text(data, "archived") === "true"),
  "Notification archive state saved.",
);

export const markAllNotificationsReadAction: NotificationAction = async (_state, data) => !only(data, []) ? { error: "The notification request contained unsupported fields." } : run(
  async () => notificationService.markAllRead(await actor()),
  "All notifications marked read.",
);
