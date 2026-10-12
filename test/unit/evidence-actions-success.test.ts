import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvidenceDomainError } from "@/modules/evidence/domain-error";

const mocks = vi.hoisted(() => ({ actor: vi.fn(), create: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/auth/session-service", () => ({ getCurrentActor: mocks.actor }));
vi.mock("@/modules/evidence/service", () => ({ evidenceService: { create: mocks.create } }));
import { createEvidenceAction } from "@/modules/evidence/actions";

function form(extra: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ kind: "certification", title: "Submitted title", submissionKey: "stable-fictional-intent", ...extra })) data.set(key, value);
  return data;
}
beforeEach(() => { vi.clearAllMocks(); mocks.actor.mockResolvedValue({ id: "fictional-owner", role: "EMPLOYEE" }); });

describe("authorized evidence create success", () => {
  it("returns only the service's saved ID, version, title and archive state for immediate file attachment", async () => {
    mocks.create.mockResolvedValue({ evidence: { id: "actual-saved-id", version: 4, title: "Saved title", archivedAt: null, ownerUserId: "fictional-owner", storageKey: "must-not-leak" }, deduplicated: true });
    const result = await createEvidenceAction({}, form({ evidenceId: "untrusted-input-id" }));
    expect(result).toEqual({ success: "Document or experience saved. Super Admin can review it.", savedItem: { id: "actual-saved-id", version: 4, title: "Saved title", archived: false } });
    expect(JSON.stringify(result)).not.toContain("must-not-leak");
    expect(mocks.create).toHaveBeenCalledWith({ id: "fictional-owner", role: "EMPLOYEE" }, expect.objectContaining({ submissionKey: "stable-fictional-intent" }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/profile");
  });

  it("identifies an archived idempotent result so its UI cannot offer an active upload", async () => {
    mocks.create.mockResolvedValue({ evidence: { id: "archived-saved-id", version: 5, title: "Archived title", archivedAt: new Date("2026-10-12T00:00:00Z") }, deduplicated: true });
    expect((await createEvidenceAction({}, form())).savedItem).toEqual({ id: "archived-saved-id", version: 5, title: "Archived title", archived: true });
  });

  it("does not return an upload destination after validation failure", async () => {
    mocks.create.mockRejectedValue(new EvidenceDomainError("VALIDATION_ERROR"));
    expect(await createEvidenceAction({}, form())).toEqual({ error: "Please check the submitted evidence information." });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses an expired session before invoking the service", async () => {
    mocks.actor.mockResolvedValue(null);
    expect(await createEvidenceAction({}, form())).toEqual({ error: "Your session expired. Sign in again." });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("keeps the unsupported-field guard", async () => {
    expect(await createEvidenceAction({}, form({ ownerUserIdOverride: "another-person" }))).toEqual({ error: "The evidence form contained unsupported fields." });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
