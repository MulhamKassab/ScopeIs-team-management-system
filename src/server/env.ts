import { environmentSchema } from "@/shared/validation/foundation";

let cached: ReturnType<typeof environmentSchema.parse> | undefined;

export function env() {
  cached ??= environmentSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    APP_ENV: process.env.APP_ENV,
    MOCK_AUTH_ENABLED: process.env.MOCK_AUTH_ENABLED,
    SESSION_TTL_HOURS: process.env.SESSION_TTL_HOURS,
  });
  return cached;
}

export function mockAuthenticationIsAllowed() {
  const config = env();
  return config.APP_ENV !== "production" && config.MOCK_AUTH_ENABLED;
}
