/** Formats that can be rendered safely inline. Everything else is authorized download-only. */
import { HOSTED_EVIDENCE_FILE_BYTES } from "./file-limits";
export const inlinePreviewTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);

/** Single byte ranges keep retained larger files deliverable without exposing storage URLs. */
export function evidenceDeliveryRange(range: string | null, size: number) {
  if (!range) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return false;
  const first = Number(match[1]); const last = Number(match[2]);
  const start = match[1] ? first : Math.max(0, size - last);
  const end = match[2] && match[1] ? last : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || (!match[1] && last < 1) || start >= size || end < start) return false;
  return { start, end: Math.min(end, size - 1, start + HOSTED_EVIDENCE_FILE_BYTES - 1) };
}

/**
 * Delivery headers for private evidence bytes: sanitized display filename, explicit disposition,
 * no content sniffing, and no shared caching. No storage key or public URL is ever included.
 */
export function evidenceFileHeaders(file: { originalFilename: string; contentType: string; sizeBytes: number }) {
  const ascii = file.originalFilename.replace(/[^\u0020-\u007e]/g, "_").replace(/["\\]/g, "_");
  const disposition = inlinePreviewTypes.has(file.contentType) ? "inline" : "attachment";
  return {
    disposition,
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.originalFilename)}`,
      "Content-Length": String(file.sizeBytes),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    } as Record<string, string>,
  };
}
