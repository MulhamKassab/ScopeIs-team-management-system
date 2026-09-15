import { EvidenceDomainError } from "@/modules/evidence/domain-error";

/** Confirmed V1 evidence file allowlist. Extensions are derived from the validated type, never the filename. */
export const MAX_EVIDENCE_FILE_BYTES = 5 * 1024 * 1024;
const allowed = {
  "application/pdf": { extension: "pdf", preview: true },
  "image/jpeg": { extension: "jpg", preview: true },
  "image/png": { extension: "png", preview: true },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { extension: "docx", preview: false },
} as const;

export const allowedEvidenceContentTypes = Object.keys(allowed) as (keyof typeof allowed)[];
const dangerousExtensions = /\.(exe|com|bat|cmd|sh|bash|js|mjs|cjs|jar|msi|dll|scr|ps1|php|py|rb|pl|html?|svg|xml|zip|rar|7z|tar|gz)$/i;

function startsWith(bytes: Uint8Array, signature: number[]) { return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value); }
function containsAscii(bytes: Uint8Array, needle: string, limit = 4096) {
  const target = new TextEncoder().encode(needle);
  const end = Math.min(bytes.length - target.length, limit);
  for (let start = 0; start <= end; start += 1) {
    let matched = true;
    for (let offset = 0; offset < target.length; offset += 1) if (bytes[start + offset] !== target[offset]) { matched = false; break; }
    if (matched) return true;
  }
  return false;
}

/** Rejects traversal shapes, control characters, leading dots, and misleading double extensions. */
export function sanitizeEvidenceFilename(name: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 200) throw new EvidenceDomainError("VALIDATION_ERROR");
  if (/[/\\]/.test(trimmed)) throw new EvidenceDomainError("VALIDATION_ERROR");
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) throw new EvidenceDomainError("VALIDATION_ERROR");
  if (trimmed.startsWith(".") || trimmed.includes("..")) throw new EvidenceDomainError("VALIDATION_ERROR");
  const parts = trimmed.split(".");
  if (parts.length > 2) throw new EvidenceDomainError("VALIDATION_ERROR");
  if (dangerousExtensions.test(trimmed)) throw new EvidenceDomainError("VALIDATION_ERROR");
  return trimmed;
}

/** Validates declared type, filename shape, size, and real file signature. Returns the trusted metadata. */
export function validateEvidenceFile(input: { bytes: Uint8Array; contentType: string; filename: string }) {
  const declared = input.contentType as keyof typeof allowed;
  if (!Object.hasOwn(allowed, declared)) throw new EvidenceDomainError("VALIDATION_ERROR");
  const clean = sanitizeEvidenceFilename(input.filename);
  if (input.bytes.byteLength < 1 || input.bytes.byteLength > MAX_EVIDENCE_FILE_BYTES) throw new EvidenceDomainError("VALIDATION_ERROR");
  const rule = allowed[declared];
  if (!clean.toLowerCase().endsWith(`.${rule.extension}`) && !(rule.extension === "jpg" && clean.toLowerCase().endsWith(".jpeg"))) throw new EvidenceDomainError("VALIDATION_ERROR");

  if (declared === "application/pdf") { if (!startsWith(input.bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) throw new EvidenceDomainError("VALIDATION_ERROR"); }
  else if (declared === "image/jpeg") { if (!startsWith(input.bytes, [0xff, 0xd8, 0xff])) throw new EvidenceDomainError("VALIDATION_ERROR"); }
  else if (declared === "image/png") { if (!startsWith(input.bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) throw new EvidenceDomainError("VALIDATION_ERROR"); }
  else if (!startsWith(input.bytes, [0x50, 0x4b, 0x03, 0x04]) || !containsAscii(input.bytes, "[Content_Types].xml") || !containsAscii(input.bytes, "word/")) throw new EvidenceDomainError("VALIDATION_ERROR");

  return { contentType: declared, extension: rule.extension, sizeBytes: input.bytes.byteLength, displayFilename: clean, canPreview: rule.preview };
}

/** Malware assessment boundary: no scanner is configured in Phase 9, and that is reported honestly. */
export function assessUploadForMalware(_input: { bytes: Uint8Array; contentType: string }) {
  return { scanned: false as const, note: "Malware scanning is not configured. Files are validated by allowlist, size, and signature only." };
}
