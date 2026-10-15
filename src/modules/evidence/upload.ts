import "server-only";
import { EvidenceDomainError } from "./domain-error";
import { evidenceUploadLimitBytes } from "./file-limits";

/** Bound the actual stream before allocating multipart fields or private file bytes. */
export async function readEvidenceUploadForm(request: Request) {
  const limit = evidenceUploadLimitBytes() + 64 * 1024;
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new EvidenceDomainError("VALIDATION_ERROR", "The upload is too large.");
  if (!request.body) throw new EvidenceDomainError("VALIDATION_ERROR");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new EvidenceDomainError("VALIDATION_ERROR", "The upload is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new ArrayBuffer(size);
  const bytes = new Uint8Array(body);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const form = await new Response(body, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData().catch(() => { throw new EvidenceDomainError("VALIDATION_ERROR"); });
  if ([...form.keys()].some((key) => !["file", "expectedVersion", "replaceFileId"].includes(key)) || form.getAll("file").length !== 1 || form.getAll("expectedVersion").length !== 1 || form.getAll("replaceFileId").length > 1) throw new EvidenceDomainError("VALIDATION_ERROR");
  return form;
}
