export const LOCAL_EVIDENCE_FILE_BYTES = 5 * 1024 * 1024;
export const HOSTED_EVIDENCE_FILE_BYTES = 4 * 1024 * 1024;
export const EVIDENCE_DOWNLOAD_CHUNK_BYTES = 1024 * 1024;

/** New hosted uploads leave room for multipart overhead below the function payload limit. */
export function evidenceUploadLimitBytes(environment: NodeJS.ProcessEnv = process.env) {
  const hosted = environment.VERCEL === "1" || environment.VERCEL === "true" || environment.VERCEL_ENV === "production";
  const production = environment.APP_ENV === "production" || environment.NODE_ENV === "production" || environment.VERCEL_ENV === "production";
  return hosted && production ? HOSTED_EVIDENCE_FILE_BYTES : LOCAL_EVIDENCE_FILE_BYTES;
}
