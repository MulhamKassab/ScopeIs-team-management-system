"use client";

import { useState } from "react";
import { EVIDENCE_DOWNLOAD_CHUNK_BYTES, HOSTED_EVIDENCE_FILE_BYTES } from "./file-limits";

export function EvidenceFileLink({ file }: { file: { id: string; sizeBytes: number; originalFilename: string; contentType: string; canPreview: boolean } }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const href = `/api/evidence/files/${file.id}`;
  if (file.sizeBytes <= HOSTED_EVIDENCE_FILE_BYTES) return <a className="button" href={href} target="_blank" rel="noreferrer">{file.canPreview ? "Preview file" : "Download file"}</a>;
  async function download() {
    if (pending) return;
    setPending(true); setError("");
    try {
      const chunks: ArrayBuffer[] = [];
      for (let start = 0; start < file.sizeBytes; start += EVIDENCE_DOWNLOAD_CHUNK_BYTES) {
        const end = Math.min(file.sizeBytes - 1, start + EVIDENCE_DOWNLOAD_CHUNK_BYTES - 1);
        const response = await fetch(href, { cache: "no-store", headers: { Range: `bytes=${start}-${end}` } });
        if (response.status !== 206 || response.headers.get("content-range") !== `bytes ${start}-${end}/${file.sizeBytes}`) throw new Error("The file is unavailable. Reload the page and check your access.");
        const chunk = await response.arrayBuffer();
        if (chunk.byteLength !== end - start + 1) throw new Error("The file download was incomplete. Try again.");
        chunks.push(chunk);
      }
      const url = URL.createObjectURL(new Blob(chunks, { type: file.contentType }));
      const link = document.createElement("a"); link.href = url; link.download = file.originalFilename;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The file could not be downloaded. Try again."); }
    finally { setPending(false); }
  }
  return <div><button className="button" type="button" onClick={download} disabled={pending}>{pending ? "Downloading…" : "Download file"}</button>{error ? <p className="operation-error" role="alert">{error}</p> : null}</div>;
}
