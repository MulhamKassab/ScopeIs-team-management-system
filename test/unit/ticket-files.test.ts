import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_HOSTED_TICKET_FILE_BYTES, MAX_TICKET_FILE_BYTES, parseTicketUpload, readBoundedTicketBody, ticketFileHeaders, ticketUploadLimitBytes, validateTicketFile } from "@/modules/tickets/files";
import { createLocalEvidenceStorage, defaultLocalEvidenceRoot } from "@/server/providers/evidence-storage";

vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/modules/tickets/service", () => ({ ticketService: {} }));

const pdf = () => new TextEncoder().encode("%PDF-1.4\nFictional ticket attachment\n%%EOF");
const upload = (filename = "Ticket evidence.pdf", type = "application/pdf") => {
  const form = new FormData();
  form.set("file", new File([pdf()], filename, { type }));
  form.set("version", "2");
  return form;
};
const request = (body: BodyInit, headers?: HeadersInit) => new Request("http://localhost/api/tickets/files", { method: "POST", body, headers });
afterEach(() => vi.unstubAllEnvs());

describe("private ticket upload boundary", () => {
  it("selects a 4 MiB production Vercel limit while preserving the 5 MiB local contract", () => {
    expect(ticketUploadLimitBytes({ APP_ENV: "production", VERCEL: "1" })).toBe(MAX_HOSTED_TICKET_FILE_BYTES);
    expect(ticketUploadLimitBytes({ NODE_ENV: "production", VERCEL: "true" })).toBe(MAX_HOSTED_TICKET_FILE_BYTES);
    expect(ticketUploadLimitBytes({ VERCEL_ENV: "production" })).toBe(MAX_HOSTED_TICKET_FILE_BYTES);
    expect(ticketUploadLimitBytes({ APP_ENV: "development", VERCEL: "1" })).toBe(MAX_TICKET_FILE_BYTES);
    expect(ticketUploadLimitBytes({ APP_ENV: "production" })).toBe(MAX_TICKET_FILE_BYTES);
    expect(ticketUploadLimitBytes({ APP_ENV: "test", NODE_ENV: "test" })).toBe(MAX_TICKET_FILE_BYTES);
  });

  it("accepts the hosted 4 MiB boundary and refuses larger service uploads", () => {
    vi.stubEnv("APP_ENV", "production"); vi.stubEnv("VERCEL", "1");
    const atLimit = new Uint8Array(MAX_HOSTED_TICKET_FILE_BYTES); atLimit.set(pdf());
    expect(validateTicketFile({ filename: "Hosted.pdf", contentType: "application/pdf", bytes: atLimit }).sizeBytes).toBe(MAX_HOSTED_TICKET_FILE_BYTES);
    const tooLarge = new Uint8Array(MAX_HOSTED_TICKET_FILE_BYTES + 1); tooLarge.set(pdf());
    expect(() => validateTicketFile({ filename: "Hosted.pdf", contentType: "application/pdf", bytes: tooLarge })).toThrow();
    const localLimit = new Uint8Array(MAX_TICKET_FILE_BYTES); localLimit.set(pdf());
    expect(() => validateTicketFile({ filename: "Local.pdf", contentType: "application/pdf", bytes: localLimit })).toThrow();
  });

  it("permits multipart overhead at 4 MiB and rejects a larger hosted file or body", async () => {
    vi.stubEnv("APP_ENV", "production"); vi.stubEnv("VERCEL", "1");
    const bytes = new Uint8Array(MAX_HOSTED_TICKET_FILE_BYTES); bytes.set(pdf());
    const atLimit = upload(); atLimit.set("file", new File([bytes], "Hosted.pdf", { type: "application/pdf" }));
    await expect(parseTicketUpload(request(atLimit))).resolves.toHaveProperty("bytes.byteLength", MAX_HOSTED_TICKET_FILE_BYTES);
    const tooLarge = upload(); tooLarge.set("file", new File([new Uint8Array(MAX_HOSTED_TICKET_FILE_BYTES + 1)], "Hosted.pdf", { type: "application/pdf" }));
    await expect(parseTicketUpload(request(tooLarge))).rejects.toMatchObject({ code: "VALIDATION" });
    const oversizedBody = new Uint8Array(MAX_HOSTED_TICKET_FILE_BYTES + 64 * 1024 + 1);
    await expect(readBoundedTicketBody(request(oversizedBody))).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("validates real PDF and image signatures with host allowlist and 5 MiB bound", () => {
    expect(validateTicketFile({ filename: "Ticket evidence.pdf", contentType: "application/pdf", bytes: pdf() })).toMatchObject({ extension: "pdf", sizeBytes: pdf().length });
    expect(validateTicketFile({ filename: "Photo.jpeg", contentType: "image/jpeg", bytes: new Uint8Array([255, 216, 255, 0]) }).extension).toBe("jpg");
    expect(validateTicketFile({ filename: "Diagram.png", contentType: "image/png", bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) }).extension).toBe("png");
    const atLimit = new Uint8Array(MAX_TICKET_FILE_BYTES); atLimit.set(pdf());
    expect(validateTicketFile({ filename: "Large.pdf", contentType: "application/pdf", bytes: atLimit }).sizeBytes).toBe(MAX_TICKET_FILE_BYTES);
    expect(() => validateTicketFile({ filename: "Large.pdf", contentType: "application/pdf", bytes: new Uint8Array(MAX_TICKET_FILE_BYTES + 1) })).toThrow();
  });

  it("rejects active formats, signature spoofing, dangerous filenames and overlong metadata", () => {
    for (const filename of ["../Ticket.pdf", "Ticket.exe.pdf", ".Ticket.pdf", "Ticket\r\n.pdf", "Ticket.svg", `${"a".repeat(177)}.pdf`]) {
      expect(() => validateTicketFile({ filename, contentType: "application/pdf", bytes: pdf() })).toThrow();
    }
    for (const contentType of ["text/html", "image/svg+xml", "application/octet-stream"]) expect(() => validateTicketFile({ filename: "Ticket.pdf", contentType, bytes: pdf() })).toThrow();
    expect(() => validateTicketFile({ filename: "Spoof.pdf", contentType: "application/pdf", bytes: new TextEncoder().encode("<html>active</html>") })).toThrow();
    expect(() => validateTicketFile({ filename: "Spoof.docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: new Uint8Array([80, 75, 3, 4, 0]) })).toThrow();
  });

  it("bounds actual bytes without trusting absent or understated Content-Length", async () => {
    await expect(readBoundedTicketBody(request(new Uint8Array(33)), 32)).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(readBoundedTicketBody(request(new Uint8Array(33), { "content-length": "1" }), 32)).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(readBoundedTicketBody(request(new Uint8Array(1), { "content-length": "99999" }), 32)).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(readBoundedTicketBody(request(new Uint8Array(1), { "content-length": "-1" }), 32)).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(readBoundedTicketBody(request(new Uint8Array(32)), 32)).resolves.toHaveProperty("byteLength", 32);
  });

  it("cancels an oversized streamed upload before receiving the remainder", async () => {
    const cancelled = vi.fn();
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(33)); }, cancel: cancelled });
    const input = new Request("http://localhost/upload", { method: "POST", body: stream, duplex: "half" } as RequestInit & { duplex: "half" });
    await expect(readBoundedTicketBody(input, 32)).rejects.toMatchObject({ code: "VALIDATION" });
    expect(cancelled).toHaveBeenCalledOnce();
  });

  it("parses exactly one file and positive ticket version, refusing client storage keys", async () => {
    await expect(parseTicketUpload(request(upload()))).resolves.toMatchObject({ version: 2, filename: "Ticket evidence.pdf", contentType: "application/pdf" });
    const injected = upload(); injected.set("storageKey", "someone-else/secret.pdf");
    await expect(parseTicketUpload(request(injected))).rejects.toMatchObject({ code: "VALIDATION" });
    const duplicated = upload(); duplicated.append("file", new File([pdf()], "Other.pdf", { type: "application/pdf" }));
    await expect(parseTicketUpload(request(duplicated))).rejects.toMatchObject({ code: "VALIDATION" });
    const duplicateVersion = upload(); duplicateVersion.append("version", "3");
    await expect(parseTicketUpload(request(duplicateVersion))).rejects.toMatchObject({ code: "VALIDATION" });
    for (const version of ["0", "1.5", "Infinity", "", "9007199254740993"]) {
      const invalid = upload(); invalid.set("version", version);
      await expect(parseTicketUpload(request(invalid))).rejects.toMatchObject({ code: "VALIDATION" });
    }
  });

  it("requires multipart parsing and rejects oversized file content before a service call", async () => {
    await expect(parseTicketUpload(request("{}", { "content-type": "application/json" }))).rejects.toMatchObject({ code: "VALIDATION" });
    const oversized = upload(); oversized.set("file", new File([new Uint8Array(MAX_TICKET_FILE_BYTES + 1)], "Large.pdf", { type: "application/pdf" }));
    await expect(parseTicketUpload(request(oversized))).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("delivers only private attachments with safe international filenames and sandbox headers", () => {
    const headers = ticketFileHeaders({ fileName: "Engineer’s تقرير.pdf", contentType: "application/pdf", byteSize: 52 });
    expect(headers["Content-Disposition"]).toMatch(/^attachment; filename="Engineer_s/);
    expect(headers["Content-Disposition"]).toContain("filename*=UTF-8''Engineer%E2%80%99s%20");
    expect(headers["Cache-Control"]).toBe("private, no-store, max-age=0");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Content-Security-Policy"]).toContain("sandbox");
    expect(JSON.stringify(headers)).not.toContain("storageKey");
  });
});

describe("durable local private storage configuration", () => {
  it("opens the same explicit absolute private directory across independent adapters", async () => {
    const directory = await mkdtemp(join(tmpdir(), "scopeis-ticket-durable-unit-"));
    try {
      vi.stubEnv("APP_ENV", "development"); vi.stubEnv("SCOPEIS_DISPOSABLE_TEST_DATABASE", "false"); vi.stubEnv("EVIDENCE_LOCAL_DIRECTORY", directory);
      const firstPath = defaultLocalEvidenceRoot();
      await createLocalEvidenceStorage(firstPath).put({ storageKey: "tickets/test/example.pdf", contentType: "application/pdf", bytes: pdf() });
      const secondPath = defaultLocalEvidenceRoot();
      expect(secondPath).toBe(firstPath);
      expect(await createLocalEvidenceStorage(secondPath).read("tickets/test/example.pdf")).toEqual(pdf());
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("keeps disposable tests isolated and rejects a relative development directory", () => {
    vi.stubEnv("APP_ENV", "test"); vi.stubEnv("EVIDENCE_LOCAL_DIRECTORY", "relative/private-directory");
    expect(defaultLocalEvidenceRoot()).toBe(join(tmpdir(), `scopeis-evidence-${process.pid}`));
    vi.stubEnv("APP_ENV", "development"); vi.stubEnv("SCOPEIS_DISPOSABLE_TEST_DATABASE", "true");
    expect(defaultLocalEvidenceRoot()).toBe(join(tmpdir(), `scopeis-evidence-${process.pid}`));
    vi.stubEnv("SCOPEIS_DISPOSABLE_TEST_DATABASE", "false");
    expect(() => defaultLocalEvidenceRoot()).toThrow();
  });

  it("accepts only a guarded, runner-owned temporary private browser-test directory", () => {
    const directory = join(tmpdir(), "scopeis-ticket-browser-files-test-root");
    vi.stubEnv("APP_ENV", "test"); vi.stubEnv("SCOPEIS_DISPOSABLE_TEST_DATABASE", "true"); vi.stubEnv("SCOPEIS_TEST_EVIDENCE_DIRECTORY", directory);
    expect(defaultLocalEvidenceRoot()).toBe(directory);
    vi.stubEnv("SCOPEIS_TEST_EVIDENCE_DIRECTORY", join(tmpdir(), "scopeis-ticket-browser-files-test-root", "nested"));
    expect(() => defaultLocalEvidenceRoot()).toThrow();
    vi.stubEnv("SCOPEIS_TEST_EVIDENCE_DIRECTORY", join(tmpdir(), "unowned-private-folder"));
    expect(() => defaultLocalEvidenceRoot()).toThrow();
    vi.stubEnv("SCOPEIS_TEST_EVIDENCE_DIRECTORY", "scopeis-ticket-browser-files-relative");
    expect(() => defaultLocalEvidenceRoot()).toThrow();
    vi.stubEnv("SCOPEIS_TEST_EVIDENCE_DIRECTORY", directory); vi.stubEnv("SCOPEIS_DISPOSABLE_TEST_DATABASE", "false");
    expect(defaultLocalEvidenceRoot()).toBe(join(tmpdir(), `scopeis-evidence-${process.pid}`));
  });
});
