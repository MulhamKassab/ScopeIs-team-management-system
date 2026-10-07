"use server";
import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/modules/auth/session-service";
import { NoteDomainError } from "@/modules/notes/domain-error";
import { managementNoteService } from "@/modules/notes/service";

export type NoteActionState = { error?: string; success?: string };
export type NoteAction = (state: NoteActionState, data: FormData) => Promise<NoteActionState>;

const text = (data: FormData, key: string) => typeof data.get(key) === "string" ? String(data.get(key)).trim() : "";
const only = (data: FormData, keys: string[]) => [...data.keys()].every((key) => keys.includes(key) || key.startsWith("$ACTION_"));
const allowed = ["subjectUserId", "visibility", "content", "noteId", "expectedVersion", "reason"];

async function actor() { const current = await getCurrentActor(); if (!current) throw new NoteDomainError("FORBIDDEN", "Your session expired. Sign in again."); return current; }
function message(error: unknown) { return error instanceof NoteDomainError ? error.message : "The note change could not be saved. Reload and try again."; }

async function run(subjectUserId: string, operation: () => Promise<unknown>, success: string) {
  try { await operation(); revalidatePath(`/employees/${subjectUserId}`); revalidatePath("/employees"); return { success }; }
  catch (error) { return { error: message(error) }; }
}

export const createManagementNoteAction: NoteAction = async (_state, data) => !only(data, allowed) ? { error: "The note form contained unsupported fields." } : run(
  text(data, "subjectUserId"),
  async () => managementNoteService.create(await actor(), { subjectUserId: text(data, "subjectUserId"), visibility: text(data, "visibility"), content: text(data, "content") }),
  "Management note saved.",
);

export const archiveManagementNoteAction: NoteAction = async (_state, data) => !only(data, allowed) ? { error: "The note form contained unsupported fields." } : run(
  text(data, "subjectUserId"),
  async () => managementNoteService.archive(await actor(), { noteId: text(data, "noteId"), expectedVersion: Number(text(data, "expectedVersion")), reason: text(data, "reason") }),
  "Management note archived. History is preserved.",
);
