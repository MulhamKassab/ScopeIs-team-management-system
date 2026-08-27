import { environmentSchema } from "@/shared/validation/foundation";

let cached: ReturnType<typeof environmentSchema.parse> | undefined;

export function parseEnvironment(input: NodeJS.ProcessEnv) {
  const isE2e = input.SCOPEIS_E2E_TEST === "true";
  const isVercelProduction = !isE2e && (input.VERCEL_ENV === "production" || input.NODE_ENV === "production");
  const config = environmentSchema.parse({
    // DATABASE_URL is the runtime contract. Managed-provider variables remain
    // compatibility fallbacks for local/provider transitions only.
    DATABASE_URL: isE2e ? input.SCOPEIS_E2E_DATABASE_URL : (input.DATABASE_URL ?? input.POSTGRES_URL ?? input.POSTGRES_URL_NON_POOLING),
    APP_ENV: isE2e ? "test" : (isVercelProduction ? "production" : (input.APP_ENV ?? "development")),
    // Temporary fictional mock access is an explicit deployment choice.
    MOCK_AUTH_ENABLED: isE2e ? "true" : (input.MOCK_AUTH_ENABLED ?? "false"),
    SESSION_TTL_HOURS: input.SESSION_TTL_HOURS && Number(input.SESSION_TTL_HOURS) > 0 ? input.SESSION_TTL_HOURS : "12",
  });
  if (config.APP_ENV === "test") {
    const hostname = new URL(config.DATABASE_URL).hostname;
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
  return config.MOCK_AUTH_ENABLED === "true";
}
