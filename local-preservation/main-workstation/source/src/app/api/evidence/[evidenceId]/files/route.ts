import { NextResponse } from "next/server";
import { getCurrentActor } from "@/modules/auth/session-service";
import { EvidenceDomainError } from "@/modules/evidence/domain-error";
import { evidenceErrorResponse } from "@/modules/evidence/http";
import { evidenceService } from "@/modules/evidence/service";
import { requireSameOrigin } from "@/server/http";

/**
 * Authorized private upload. Media type, size, filename, and real file signature are validated by the
 * service; the client never supplies or learns a storage key.
 */
export async function POST(request: Request, { params }: { params: Promise<{ evidenceId: string }> }) {
  try {
    requireSameOrigin(request);
    const actor = await getCurrentActor();
    if (!actor) throw new EvidenceDomainError("FORBIDDEN", "Your session expired. Sign in again.");
    const { evidenceId } = await params;
    const form = await request.formData().catch(() => { throw new EvidenceDomainError("VALIDATION_ERROR"); });
    const file = form.get("file");
    if (!(file instanceof File)) throw new EvidenceDomainError("VALIDATION_ERROR");
    const expectedVersion = Number(form.get("expectedVersion"));
    const replacement = form.get("replaceFileId");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await evidenceService.attachFile(actor, {
      evidenceId, expectedVersion, replaceFileId: typeof replacement === "string" && replacement ? replacement : undefined,
      bytes, contentType: file.type, filename: file.name,
    });
    return NextResponse.json({ ok: true, fileId: result.file.id, version: result.evidence.version, contentType: result.file.contentType, sizeBytes: result.file.sizeBytes });
  } catch (error) { return evidenceErrorResponse(error); }
}
