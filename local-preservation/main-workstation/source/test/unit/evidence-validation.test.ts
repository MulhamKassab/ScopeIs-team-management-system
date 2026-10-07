import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EvidenceDomainError } from "@/modules/evidence/domain-error";
import { MAX_EVIDENCE_FILE_BYTES, assessUploadForMalware, sanitizeEvidenceFilename, validateEvidenceFile } from "@/modules/evidence/file-validation";
import { evidenceFileHeaders } from "@/modules/evidence/delivery";
import { deriveExpiryStatus, dubaiBusinessDate, evidenceCreateSchema, isNewOrUpdated, parseEvidence } from "@/modules/evidence/validation";
import { createLocalEvidenceStorage, evidenceObjectKey } from "@/server/providers/evidence-storage";
import { evidenceFixtures, phase9Evidence } from "../../scripts/phase9-test-fixtures.mjs";

describe("Phase 9 portfolio link validation", () => {
  it("accepts an absolute HTTPS link with a hostname", () => {
    expect(parseEvidence(evidenceCreateSchema, phase9Evidence.portfolio).externalUrl).toBe("https://example.test/fictional-portfolio");
  });
  it("rejects relative, insecure, and script-bearing links", () => {
    for (const externalUrl of ["/fictional", "http://example.test/x", "javascript:alert(1)", "data:text/html;base64,QQ==", "file:///etc/passwd", "https://user:pass@example.test/x"]) {
      expect(() => parseEvidence(evidenceCreateSchema, { ...phase9Evidence.portfolio, externalUrl })).toThrow(EvidenceDomainError);
    }
  });
  it("rejects a link longer than the documented maximum", () => {
    expect(() => parseEvidence(evidenceCreateSchema, { ...phase9Evidence.portfolio, externalUrl: `https://example.test/${"a".repeat(2100)}` })).toThrow(EvidenceDomainError);
  });
  it("rejects unknown evidence kinds and unsupported fields", () => {
    expect(() => parseEvidence(evidenceCreateSchema, { ...phase9Evidence.certification, kind: "certificate" })).toThrow(EvidenceDomainError);
    expect(() => parseEvidence(evidenceCreateSchema, { ...phase9Evidence.certification, ownerUserId: "mock-employee-cora" })).toThrow(EvidenceDomainError);
  });
});

describe("Phase 9 expiry derivation", () => {
  const today = "2026-06-15";
  it("derives no_expiry, valid, and expired without persisting a flag", () => {
    expect(deriveExpiryStatus(null, today)).toBe("no_expiry");
    expect(deriveExpiryStatus("2026-06-15", today)).toBe("valid");
    expect(deriveExpiryStatus("2026-06-16", today)).toBe("valid");
    expect(deriveExpiryStatus("2026-06-14", today)).toBe("expired");
  });
  it("uses the Asia/Dubai business date", () => {
    expect(dubaiBusinessDate(new Date("2026-06-15T20:30:00Z"))).toBe("2026-06-16");
  });
});

describe("Phase 9 new/updated marker", () => {
  it("is new until reviewed and new again after a later owner submission", () => {
    expect(isNewOrUpdated({ lastSubmittedAt: new Date("2026-06-01T00:00:00Z"), reviewedAt: null })).toBe(true);
    expect(isNewOrUpdated({ lastSubmittedAt: new Date("2026-06-01T00:00:00Z"), reviewedAt: new Date("2026-06-02T00:00:00Z") })).toBe(false);
    expect(isNewOrUpdated({ lastSubmittedAt: new Date("2026-06-03T00:00:00Z"), reviewedAt: new Date("2026-06-02T00:00:00Z") })).toBe(true);
  });
});

describe("Phase 9 filename and file content validation", () => {
  it("rejects traversal shapes, control characters, leading dots, and double extensions", () => {
    for (const name of ["../escape.pdf", "nested/path.pdf", "nested\\path.pdf", ".hidden.pdf", "invoice.pdf.exe", "script.sh", "a\u0000b.pdf", "", `${"a".repeat(300)}.pdf`]) {
      expect(() => sanitizeEvidenceFilename(name)).toThrow(EvidenceDomainError);
    }
    expect(sanitizeEvidenceFilename("Fictional Certificate.pdf")).toBe("Fictional Certificate.pdf");
  });
  it("accepts each allowed type only when its real signature matches", () => {
    expect(validateEvidenceFile({ bytes: evidenceFixtures.pdf(), contentType: "application/pdf", filename: "evidence.pdf" }).contentType).toBe("application/pdf");
    expect(validateEvidenceFile({ bytes: evidenceFixtures.png(), contentType: "image/png", filename: "evidence.png" }).canPreview).toBe(true);
    expect(validateEvidenceFile({ bytes: evidenceFixtures.jpeg(), contentType: "image/jpeg", filename: "evidence.jpeg" }).extension).toBe("jpg");
    const docx = validateEvidenceFile({ bytes: evidenceFixtures.docx(), contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", filename: "evidence.docx" });
    expect(docx.canPreview).toBe(false);
  });
  it("rejects spoofed content, mismatched extensions, empty files, and oversized files", () => {
    expect(() => validateEvidenceFile({ bytes: evidenceFixtures.spoofedPdf(), contentType: "application/pdf", filename: "evidence.pdf" })).toThrow(EvidenceDomainError);
    expect(() => validateEvidenceFile({ bytes: evidenceFixtures.pdf(), contentType: "application/pdf", filename: "evidence.txt" })).toThrow(EvidenceDomainError);
    expect(() => validateEvidenceFile({ bytes: new Uint8Array([]), contentType: "application/pdf", filename: "evidence.pdf" })).toThrow(EvidenceDomainError);
    expect(() => validateEvidenceFile({ bytes: new Uint8Array(MAX_EVIDENCE_FILE_BYTES + 1), contentType: "application/pdf", filename: "evidence.pdf" })).toThrow(EvidenceDomainError);
    expect(() => validateEvidenceFile({ bytes: evidenceFixtures.scriptBytes(), contentType: "application/pdf", filename: "evidence.pdf" })).toThrow(EvidenceDomainError);
    expect(() => validateEvidenceFile({ bytes: evidenceFixtures.pdf(), contentType: "text/plain" as never, filename: "evidence.txt" })).toThrow(EvidenceDomainError);
  });
  it("reports the malware boundary honestly instead of claiming a scan", () => {
    const assessment = assessUploadForMalware({ bytes: evidenceFixtures.pdf(), contentType: "application/pdf" });
    expect(assessment.scanned).toBe(false);
    expect(assessment.note).toMatch(/not configured/i);
  });
});

describe("Phase 9 private delivery headers", () => {
  it("previews only PDF/JPEG/PNG and downloads DOCX with a sanitized filename", () => {
    const pdf = evidenceFileHeaders({ originalFilename: "Fictional Evidence.pdf", contentType: "application/pdf", sizeBytes: 22 });
    expect(pdf.disposition).toBe("inline");
    expect(pdf.headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(pdf.headers["Cache-Control"]).toBe("private, no-store, max-age=0");
    expect(pdf.headers["Content-Disposition"]).toContain('filename="Fictional Evidence.pdf"');
    const docx = evidenceFileHeaders({ originalFilename: "Fictional CV.docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", sizeBytes: 40 });
    expect(docx.disposition).toBe("attachment");
    const curly = evidenceFileHeaders({ originalFilename: 'Résumé "final".pdf', contentType: "application/pdf", sizeBytes: 10 });
    expect(curly.headers["Content-Disposition"]).toContain('filename="R_sum_ _final_.pdf"');
    expect(curly.headers["Content-Disposition"]).toContain("filename*=UTF-8''");
  });
});

describe("Phase 9 object keys and local private storage", () => {
  it("generates an opaque owner-scoped key that never contains the user filename", () => {
    const key = evidenceObjectKey({ ownerUserId: "mock-employee-cora", extension: "pdf" });
    expect(key).toMatch(/^evidence\/mock-employee-cora\/[0-9a-f-]{36}\.pdf$/);
    expect(key).not.toContain("Fictional");
  });
  it("round-trips bytes, refuses traversal, and reports missing keys without throwing", async () => {
    const root = await mkdtemp(join(tmpdir(), "scopeis-evidence-unit-"));
    try {
      const storage = createLocalEvidenceStorage(root);
      const storageKey = evidenceObjectKey({ ownerUserId: "mock-employee-cora", extension: "pdf" });
      await storage.put({ storageKey, bytes: evidenceFixtures.pdf(), contentType: "application/pdf" });
      expect(new TextDecoder().decode((await storage.read(storageKey)) ?? new Uint8Array())).toContain("%PDF-1.4");
      // The adapter rejects a traversal-shaped key outright rather than resolving it.
      await expect(storage.read("../../etc/passwd")).rejects.toThrow();
      expect(await storage.read(evidenceObjectKey({ ownerUserId: "mock-employee-cora", extension: "png" }))).toBeNull();
      await storage.remove(storageKey);
      expect(await storage.read(storageKey)).toBeNull();
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
