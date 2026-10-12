"use server";
import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/modules/auth/session-service";
import { EvidenceDomainError } from "@/modules/evidence/domain-error";
import { evidenceService } from "@/modules/evidence/service";

export type EvidenceActionState = { error?: string; success?: string; savedItem?: { id: string; version: number; title: string; archived: boolean } };
export type EvidenceAction = (state: EvidenceActionState, data: FormData) => Promise<EvidenceActionState>;

const text = (data: FormData, key: string) => typeof data.get(key) === "string" ? String(data.get(key)).trim() : "";
const optional = (data: FormData, key: string) => { const value = text(data, key); return value === "" ? undefined : value; };
const only = (data: FormData, keys: string[]) => [...data.keys()].every((key) => keys.includes(key) || key.startsWith("$ACTION_"));
const allowed = ["kind", "title", "issuer", "issueDate", "expiryDate", "relatedSkillId", "externalUrl", "details", "submissionKey", "evidenceId", "expectedVersion", "state", "ownerUserId"];

async function actor() { const current = await getCurrentActor(); if (!current) throw new EvidenceDomainError("FORBIDDEN", "Your session expired. Sign in again."); return current; }
function message(error: unknown) { return error instanceof EvidenceDomainError ? error.message : "The capability evidence change could not be saved. Reload and try again."; }
function refresh() { for (const path of ["/profile", "/skills"]) revalidatePath(path); }

async function run(operation: () => Promise<unknown>, success: string, extraRefresh: string[] = []) {
  try { await operation(); refresh(); for (const path of extraRefresh) revalidatePath(path); return { success }; }
  catch (error) { return { error: message(error) }; }
}

export const createEvidenceAction: EvidenceAction = async (_state, data) => {
  if (!only(data, allowed)) return { error: "The evidence form contained unsupported fields." };
  try {
    const { evidence } = await evidenceService.create(await actor(), {
      kind: text(data, "kind"), title: text(data, "title"), issuer: optional(data, "issuer"), issueDate: optional(data, "issueDate"), expiryDate: optional(data, "expiryDate"),
      relatedSkillId: optional(data, "relatedSkillId"), externalUrl: optional(data, "externalUrl"), details: optional(data, "details"), submissionKey: optional(data, "submissionKey"),
    });
    refresh();
    // Only the authorized saved record supplies the upload destination and optimistic version.
    return { success: "Document or experience saved. Super Admin can review it.", savedItem: { id: evidence.id, version: evidence.version, title: evidence.title, archived: Boolean(evidence.archivedAt) } };
  } catch (error) { return { error: message(error) }; }
};

export const updateEvidenceAction: EvidenceAction = async (_state, data) => !only(data, allowed) ? { error: "The evidence form contained unsupported fields." } : run(
  async () => evidenceService.update(await actor(), {
    evidenceId: text(data, "evidenceId"), expectedVersion: Number(text(data, "expectedVersion")), title: text(data, "title"), issuer: optional(data, "issuer"),
    issueDate: optional(data, "issueDate"), expiryDate: optional(data, "expiryDate"), relatedSkillId: optional(data, "relatedSkillId"), externalUrl: optional(data, "externalUrl"), details: optional(data, "details"),
  }), "Capability evidence updated and marked for review.",
);

export const archiveEvidenceAction: EvidenceAction = async (_state, data) => !only(data, allowed) ? { error: "The evidence form contained unsupported fields." } : run(
  async () => evidenceService.archive(await actor(), { evidenceId: text(data, "evidenceId"), expectedVersion: Number(text(data, "expectedVersion")) }),
  "Capability evidence archived. History is preserved.",
);

export const reviewEvidenceAction: EvidenceAction = async (_state, data) => !only(data, allowed) ? { error: "The evidence form contained unsupported fields." } : run(
  async () => evidenceService.review(await actor(), { evidenceId: text(data, "evidenceId"), expectedVersion: Number(text(data, "expectedVersion")), state: text(data, "state") }),
  "Review state saved.", [`/employees/${text(data, "ownerUserId")}`],
);
