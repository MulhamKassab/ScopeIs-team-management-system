import { environmentSchema } from "@/shared/validation/foundation";

let cached: ReturnType<typeof environmentSchema.parse> | undefined;

export function parseEnvironment(input: NodeJS.ProcessEnv) {
  const target = input.DATABASE_URL ? new URL(input.DATABASE_URL) : null;
  const isE2e = input.SCOPEIS_E2E_TEST === "true" && input.SCOPEIS_DISPOSABLE_TEST_DATABASE === "true"
    && !input.VERCEL_ENV && !input.VERCEL && target !== null
    && ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)
    && /test/.test(target.pathname) && !/(prod|production|live)/i.test(target.pathname);
  const isVercelProduction = !isE2e && (input.VERCEL_ENV === "production" || input.NODE_ENV === "production");
  const appEnv = isE2e ? "test" : (isVercelProduction ? "production" : (input.APP_ENV ?? "development"));
  const config = environmentSchema.parse({
    DATABASE_URL: input.DATABASE_URL,
    APP_ENV: appEnv,
    MOCK_AUTH_ENABLED: input.MOCK_AUTH_ENABLED ?? "false",
    SESSION_TTL_HOURS: input.SESSION_TTL_HOURS && Number(input.SESSION_TTL_HOURS) > 0 ? input.SESSION_TTL_HOURS : "12",
    // Production must never silently fall back to local disk storage; the explicit choice is required.
    EVIDENCE_STORAGE_MODE: input.EVIDENCE_STORAGE_MODE ?? (appEnv === "production" ? "unconfigured" : "local"),
  });
  const databaseTarget = new URL(config.DATABASE_URL);
  if (databaseTarget.protocol !== "postgresql:" && databaseTarget.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use a PostgreSQL URL scheme.");
  }
  if (config.APP_ENV === "test") {
    const hostname = databaseTarget.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1" && !hostname.endsWith(".test")) throw new Error("Test mode requires a local or .test database target.");
  }
  return config;
}

export function env() {
  if (cached) return cached;
  cached = parseEnvironment(process.env);
  return cached;
}

export function mockAuthenticationIsAllowed() {
  return isMockAuthenticationEnabled(env());
}

export function isMockAuthenticationEnabled(config: ReturnType<typeof environmentSchema.parse>) {
  return config.APP_ENV !== "production" && config.MOCK_AUTH_ENABLED === "true";
}
