import { seedPhase4Journey } from "./phase4-test-fixtures.mjs";

export { seedPhase4Journey };

/** Fictional, non-personal evidence bytes that satisfy the real signature checks. */
export const evidenceFixtures = {
  pdf(text = "Fictional ScopeIs evidence") { return new TextEncoder().encode(`%PDF-1.4\n% ${text}\n%%EOF\n`); },
  png() { return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]); },
  jpeg() { return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]); },
  /** Minimal ZIP-shaped DOCX: local file header plus the two members the validator requires. */
  docx() {
    const head = [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00];
    return new Uint8Array([...head, ...new TextEncoder().encode("[Content_Types].xml"), 0x00, ...new TextEncoder().encode("word/document.xml"), 0x00]);
  },
  /** A signature that claims PDF but is not one, used for spoofing tests. */
  spoofedPdf() { return new TextEncoder().encode("this is not really a pdf document"); },
  /** An executable disguised with a PDF name, used for filename tests. */
  scriptBytes() { return new TextEncoder().encode("#!/bin/sh\necho nope\n"); },
};

export const phase9Evidence = {
  certification: { kind: "certification", title: "Fictional Arc Flash Certification", issuer: "Fictional Safety Institute", issueDate: "2026-01-15", expiryDate: "2027-01-15" },
  expiredCertification: { kind: "certification", title: "Fictional Expired Certification", issuer: "Fictional Safety Institute", issueDate: "2024-01-01", expiryDate: "2025-01-01" },
  portfolio: { kind: "portfolio", title: "Fictional Commissioning Portfolio", externalUrl: "https://example.test/fictional-portfolio", details: "Fictional commissioning examples." },
  projectExample: { kind: "project_example", title: "Fictional Switchgear Retrofit", details: "Fictional retrofit delivery example. Not a schedule or client record." },
  cv: { kind: "cv", title: "Fictional CV", details: "Fictional curriculum vitae." },
  supportingDocument: { kind: "supporting_document", title: "Fictional Training Record", issuer: "Fictional Training Body", issueDate: "2026-02-01" },
};

/** Seeds the operational + scheduling fixture set the evidence tests and journeys build on. */
export async function seedPhase9Journey(databaseUrl) { await seedPhase4Journey(databaseUrl); }
