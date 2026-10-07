/** Formats that can be rendered safely inline. Everything else is authorized download-only. */
export const inlinePreviewTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);

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
