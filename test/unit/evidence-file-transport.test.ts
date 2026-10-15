import { afterEach, describe, expect, it, vi } from "vitest";
import { evidenceUploadLimitBytes, HOSTED_EVIDENCE_FILE_BYTES, LOCAL_EVIDENCE_FILE_BYTES } from "@/modules/evidence/file-limits";
import { evidenceDeliveryRange } from "@/modules/evidence/delivery";
import { readEvidenceUploadForm } from "@/modules/evidence/upload";
import { validateEvidenceFile } from "@/modules/evidence/file-validation";

afterEach(() => vi.unstubAllEnvs());
describe("private evidence transport", () => {
  it("retains the local limit and enforces the smaller hosted maximum", () => {
    expect(evidenceUploadLimitBytes({ APP_ENV: "test", VERCEL: "1" })).toBe(LOCAL_EVIDENCE_FILE_BYTES);
    expect(evidenceUploadLimitBytes({ APP_ENV: "production", VERCEL: "1" })).toBe(HOSTED_EVIDENCE_FILE_BYTES);
    vi.stubEnv("APP_ENV", "production"); vi.stubEnv("VERCEL", "1");
    const bytes = new Uint8Array(HOSTED_EVIDENCE_FILE_BYTES + 1); bytes.set(new TextEncoder().encode("%PDF-1.4"));
    expect(() => validateEvidenceFile({ bytes, contentType: "application/pdf", filename: "evidence.pdf" })).toThrow(/4 MiB/);
  });
  it("bounds retained file ranges and rejects invalid or multi-range requests", () => {
    const size = LOCAL_EVIDENCE_FILE_BYTES;
    expect(evidenceDeliveryRange("bytes=0-", size)).toEqual({ start: 0, end: HOSTED_EVIDENCE_FILE_BYTES - 1 });
    expect(evidenceDeliveryRange(`bytes=${HOSTED_EVIDENCE_FILE_BYTES}-`, size)).toEqual({ start: HOSTED_EVIDENCE_FILE_BYTES, end: size - 1 });
    expect(evidenceDeliveryRange("bytes=-10", size)).toEqual({ start: size - 10, end: size - 1 });
    for (const value of ["bytes=5-2", `bytes=${size}-`, "bytes=-0", "bytes=0-1,4-5", "bytes=-"]) expect(evidenceDeliveryRange(value, size)).toBe(false);
  });
  it("bounds actual multipart streams even without a truthful content length", async () => {
    vi.stubEnv("APP_ENV", "production"); vi.stubEnv("VERCEL", "1");
    const bytes = new Uint8Array(HOSTED_EVIDENCE_FILE_BYTES + 64 * 1024 + 1);
    await expect(readEvidenceUploadForm(new Request("http://localhost/upload", { method: "POST", body: bytes }))).rejects.toThrow(/too large/);
    const form = new FormData(); form.set("file", new File(["%PDF-1.4"], "example.pdf", { type: "application/pdf" })); form.set("expectedVersion", "1");
    expect((await readEvidenceUploadForm(new Request("http://localhost/upload", { method: "POST", body: form }))).get("expectedVersion")).toBe("1");
    form.append("file", new File(["%PDF-1.4"], "other.pdf"));
    await expect(readEvidenceUploadForm(new Request("http://localhost/upload", { method: "POST", body: form }))).rejects.toThrow();
  });
});
