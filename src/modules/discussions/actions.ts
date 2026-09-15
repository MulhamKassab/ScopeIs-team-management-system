"use server";
import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/modules/auth/session-service";
import { DiscussionDomainError } from "@/modules/discussions/domain-error";
import { discussionService } from "@/modules/discussions/service";

export type DiscussionActionState = { error?: string; success?: string };
export type DiscussionAction = (state: DiscussionActionState, data: FormData) => Promise<DiscussionActionState>;

const text = (data: FormData, key: string) => typeof data.get(key) === "string" ? String(data.get(key)).trim() : "";
const only = (data: FormData, keys: string[]) => [...data.keys()].every((key) => keys.includes(key) || key.startsWith("$ACTION_"));
const allowed = ["parentType", "parentId", "content", "messageId", "expectedVersion"];

async function actor() { const current = await getCurrentActor(); if (!current) throw new DiscussionDomainError("FORBIDDEN", "Your session expired. Sign in again."); return current; }
function message(error: unknown) { return error instanceof DiscussionDomainError ? error.message : "The message could not be saved. Reload and try again."; }
function refresh() { for (const path of ["/requests", "/replacements"]) revalidatePath(path); }

export const postDiscussionMessageAction: DiscussionAction = async (_state, data) => {
  if (!only(data, allowed)) return { error: "The message form contained unsupported fields." };
  try {
    await discussionService.postMessage(await actor(), { parentType: text(data, "parentType"), parentId: text(data, "parentId"), content: text(data, "content") });
    refresh();
    return { success: "Message sent to the other participants." };
  } catch (error) { return { error: message(error) }; }
};

export const archiveDiscussionMessageAction: DiscussionAction = async (_state, data) => {
  if (!only(data, allowed)) return { error: "The message form contained unsupported fields." };
  try {
    await discussionService.archiveMessage(await actor(), { messageId: text(data, "messageId"), expectedVersion: Number(text(data, "expectedVersion")) });
    refresh();
    return { success: "Message archived. History is preserved." };
  } catch (error) { return { error: message(error) }; }
};
