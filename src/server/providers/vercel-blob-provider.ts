import "server-only";
import { del, get, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { errors } from "@/shared/errors/app-error";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const maxBytes = 5 * 1024 * 1024;

export function validatePrivateUpload(file: { type: string; size: number; name: string }) {
  if (!allowedTypes.has(file.type) || file.size < 1 || file.size > maxBytes || /\.(svg|html?|js|mjs|exe|sh)$/i.test(file.name)) throw errors.validation();
}

export const vercelBlobPrivateStorage = {
  async put(ownerId: string, file: File) {
    validatePrivateUpload(file);
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const pathname = `employee-evidence/${ownerId}/${randomUUID()}.${extension}`;
    const result = await put(pathname, file, { access: "private", addRandomSuffix: false, contentType: file.type });
    return { storageKey: result.pathname, contentType: file.type, sizeBytes: file.size };
  },
  async read(storageKey: string) { return get(storageKey, { access: "private" }); },
  async archive(storageKey: string) { await del(storageKey); },
};
