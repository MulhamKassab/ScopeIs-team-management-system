// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EvidenceFileLink } from "@/modules/evidence/file-link";
import { EVIDENCE_DOWNLOAD_CHUNK_BYTES } from "@/modules/evidence/file-limits";

afterEach(() => vi.unstubAllGlobals());
it("stops a retained-file download when access is revoked between chunks", async () => {
  const size = 5 * 1024 * 1024;
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(new ArrayBuffer(EVIDENCE_DOWNLOAD_CHUNK_BYTES), { status: 206, headers: { "Content-Range": `bytes 0-${EVIDENCE_DOWNLOAD_CHUNK_BYTES - 1}/${size}` } })).mockResolvedValueOnce(new Response(null, { status: 403 }));
  vi.stubGlobal("fetch", fetcher);
  render(<EvidenceFileLink file={{ id: "retained-id", sizeBytes: size, originalFilename: "Retained.pdf", contentType: "application/pdf", canPreview: true }} />);
  fireEvent.click(screen.getByRole("button", { name: "Download file" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/unavailable/));
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1][1].headers.Range).toBe(`bytes=${EVIDENCE_DOWNLOAD_CHUNK_BYTES}-${EVIDENCE_DOWNLOAD_CHUNK_BYTES * 2 - 1}`);
  expect(screen.getByRole("button", { name: "Download file" })).toBeEnabled();
});
