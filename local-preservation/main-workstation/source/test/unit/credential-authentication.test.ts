import { describe, expect, it } from "vitest";
import { credentialLoginSchema, normalizeIdentifier } from "@/modules/auth/credential-validation";
import { hashPassword, passwordPepper, verifyPassword } from "@/modules/auth/password";
import { sessionExpiry } from "@/modules/auth/session-record";
import { errors } from "@/shared/errors/app-error";
import { errorResponse, requireSameOrigin } from "@/server/http";
import { auditMetadataFields } from "@/modules/audit/presentation";

const pepper = "fictional-unit-pepper-only-0000000000000000";
describe("credential authentication", () => {
  it("normalizes trimmed case-insensitive usernames and email addresses", () => {
    expect(normalizeIdentifier(" NORA ")).toBe("nora");
    expect(normalizeIdentifier(" NORA@EXAMPLE.TEST ")).toBe("nora@example.test");
  });
  it("strictly bounds inputs without changing passwords", () => {
    expect(credentialLoginSchema.parse({ identifier: " Nora ", password: " Mixed " })).toEqual({ identifier: "Nora", password: " Mixed " });
    for (const input of [{ identifier: " ", password: "x" }, { identifier: "x".repeat(255), password: "x" },
      { identifier: "nora", password: "x".repeat(129) }, { identifier: "nora", password: "" }, { identifier: "nora", password: "x", role: "SUPER_ADMIN" }]) {
      expect(credentialLoginSchema.safeParse(input).success).toBe(false);
    }
  });
  it("uses unique salts, versioned scrypt and case-sensitive verification", async () => {
    const a = await hashPassword("Fictional-Unit-Secret", pepper);
    const b = await hashPassword("Fictional-Unit-Secret", pepper);
    expect(a === b).toBe(false);
    expect(a.split("$")[5] === b.split("$")[5]).toBe(false);
    expect(await verifyPassword("Fictional-Unit-Secret", a, pepper)).toBe(true);
    expect(await verifyPassword("fictional-unit-secret", a, pepper)).toBe(false);
    expect(await verifyPassword("Wrong-Unit-Secret", a, pepper)).toBe(false);
    expect(await verifyPassword("Fictional-Unit-Secret", a, `${pepper}different`)).toBe(false);
  });
  it("executes dummy verification for missing or malformed stored credentials", async () => {
    expect(await verifyPassword("Fictional-Unit-Secret", null, pepper)).toBe(false);
    expect(await verifyPassword("Fictional-Unit-Secret", "invalid", pepper)).toBe(false);
    await expect(verifyPassword("x".repeat(129), null, pepper)).rejects.toThrow(errors.validation().message);
  });
  it("fails closed for a missing or short Production pepper", () => {
    expect(() => passwordPepper({ APP_ENV: "production" })).toThrow(errors.authUnavailable().message);
    expect(() => passwordPepper({ AUTH_PASSWORD_PEPPER: "short" })).toThrow(errors.authUnavailable().message);
  });
  it("bounds session expiry", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(sessionExpiry(now, 24).getTime() - now.getTime()).toBe(86_400_000);
    for (const hours of [0, -1, 169, 1.5]) expect(() => sessionExpiry(now, hours)).toThrow();
  });
  it("maps public credential failures to the same safe message", async () => {
    const response = errorResponse(errors.invalidCredentials());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "INVALID_CREDENTIALS", message: "The username/email or password is incorrect." });
  });
  it("requires the same scheme and host and refuses malformed origins", () => {
    expect(() => requireSameOrigin(new Request("https://scopeis.test/api/auth/login", { headers: { origin: "https://scopeis.test" } }))).not.toThrow();
    for (const origin of ["http://scopeis.test", "https://other.test", "invalid"]) expect(() => requireSameOrigin(new Request("https://scopeis.test/api/auth/login", { headers: { origin } }))).toThrow();
  });
  it("checks the browser Host when Next reconstructs an internal request URL", () => {
    const request = (origin: string) => new Request("http://localhost:4000/api/auth/login", { headers: { host: "127.0.0.1:4000", origin } });
    expect(() => requireSameOrigin(request("http://127.0.0.1:4000"))).not.toThrow();
    for (const origin of ["http://localhost:4000", "https://127.0.0.1:4000", "http://127.0.0.1:4001", "null", "http://127.0.0.1:4000/path"]) {
      expect(() => requireSameOrigin(request(origin))).toThrow();
    }
  });
  it("safely projects credential audit metadata", () => {
    expect(auditMetadataFields("auth.password_session.refused", { reason: "locked", password: "secret", identifier: "nora" })).toEqual([{ key: "reason", value: "locked" }]);
    expect(auditMetadataFields("auth.password_session.refused", { reason: "untrusted content" })).toEqual([]);
    expect(auditMetadataFields("auth.password_session.started", { token: "secret" })).toEqual([]);
    expect(auditMetadataFields("unknown", { password: "secret" })).toEqual([]);
  });
});
