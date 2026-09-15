import { createHash, randomBytes } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const baseUrl = process.env.SCOPEIS_ROUTE_BASE_URL;
if (!baseUrl || !/^http:\/\/127\.0\.0\.1:\d+$/.test(baseUrl)) throw new Error("A loopback Phase 1 route-certification server is required.");
if (process.env.APP_ENV !== "test" || process.env.SCOPEIS_E2E_TEST !== "true") throw new Error("Route certification must run in explicit test mode.");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const createdSessionIds = new Set<string>();
// These per-role module sets are the certified contract and must mirror
// `src/modules/authorization/capabilities.ts`. `moduleKeys` deliberately lists every module so a
// persona can never silently skip a route check.
const moduleKeys = ["dashboard", "employees", "skills", "clients", "projects", "locations", "schedule", "map", "leave", "coverage", "replacements", "notifications", "reports", "audit", "settings", "profile", "requests"] as const;
const superAdminModules = [...moduleKeys];
const adminModules = ["dashboard", "employees", "skills", "clients", "projects", "locations", "schedule", "map", "leave", "coverage", "replacements", "notifications", "profile"];
const employeeModules = ["dashboard", "skills", "schedule", "leave", "profile", "notifications", "requests"];

type Persona = {
  id: string;
  displayName: string;
  role: "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";
  allowedModules: string[];
  /**
   * Modules the role holds no capability for but where a dedicated page deliberately renders a
   * non-enumerating "management-only" refusal instead of a 404. The page must stay unlinked in
   * navigation and must not project any management data.
   */
  refusalModules?: string[];
  alphaStatus: number;
  bravoStatus: number;
};

const personas: Persona[] = [
  { id: "mock-super-admin-nora", displayName: "Nora Albright", role: "SUPER_ADMIN", allowedModules: superAdminModules, alphaStatus: 200, bravoStatus: 200 },
  { id: "mock-admin-ava", displayName: "Ava Mercer", role: "ADMIN", allowedModules: adminModules, alphaStatus: 200, bravoStatus: 403 },
  { id: "mock-admin-ben", displayName: "Ben Iqbal", role: "ADMIN", allowedModules: adminModules, alphaStatus: 403, bravoStatus: 200 },
  { id: "mock-employee-cora", displayName: "Cora Bell", role: "EMPLOYEE", allowedModules: employeeModules, refusalModules: ["coverage", "replacements"], alphaStatus: 403, bravoStatus: 403 },
  { id: "mock-employee-dan", displayName: "Dan Rowan", role: "EMPLOYEE", allowedModules: employeeModules, refusalModules: ["coverage", "replacements"], alphaStatus: 403, bravoStatus: 403 },
];

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function safeResponse(body: string, rawToken?: string) {
  expect(body).not.toContain(rawToken ?? "impossible-token-marker");
  expect(body).not.toMatch(/postgres(?:ql)?:\/\//i);
  expect(body).not.toMatch(/DATABASE_URL|PGPASSWORD|node_modules|src\/app|SQLSTATE|at Server\./i);
}

async function request(path: string, options: RequestInit = {}) {
  return fetch(`${baseUrl}${path}`, { redirect: "manual", ...options });
}

async function login(personaId: string) {
  const response = await request("/api/auth/mock-login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    body: JSON.stringify({ personaId }),
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, redirectTo: "/dashboard" });
  const setCookie = response.headers.get("set-cookie");
  expect(setCookie).toBeTruthy();
  const match = setCookie?.match(/scopeis_session=([^;]+)/);
  expect(match?.[1]).toBeTruthy();
  const token = match![1];
  expect(token).toHaveLength(43);
  const lowerCookie = setCookie!.toLowerCase();
  expect(lowerCookie).toContain("httponly");
  expect(lowerCookie).toContain("samesite=lax");
  expect(lowerCookie).toContain("path=/");
  expect(lowerCookie).toContain("expires=");
  expect(lowerCookie).not.toContain("secure");

  const stored = await pool.query(
    `select s.id, s.user_id, s.token_hash, s.expires_at, s.revoked_at, u.role::text as role
       from sessions s join users u on u.id = s.user_id
      where s.token_hash = $1`,
    [tokenHash(token)],
  );
  expect(stored.rowCount).toBe(1);
  expect(stored.rows[0].user_id).toBe(personaId);
  expect(stored.rows[0].token_hash).not.toBe(token);
  expect(stored.rows[0].revoked_at).toBeNull();
  createdSessionIds.add(stored.rows[0].id);
  return { token, cookie: `scopeis_session=${token}`, sessionId: stored.rows[0].id, role: stored.rows[0].role as Persona["role"] };
}

async function logout(cookie: string) {
  return request("/api/auth/logout", { method: "POST", headers: { Cookie: cookie, Origin: baseUrl } });
}

async function assertScope(cookie: string, scope: string, expectedStatus: number) {
  const response = await request(`/api/foundation/scope/${scope}`, { headers: { Cookie: cookie } });
  expect(response.status).toBe(expectedStatus);
  safeResponse(await response.text());
}

beforeAll(async () => {
  const fixtureRows = await pool.query("select id from users where id = any($1::text[])", [personas.map((persona) => persona.id)]);
  expect(fixtureRows.rowCount).toBe(5);
});

afterAll(async () => {
  const ids = [...createdSessionIds];
  if (ids.length) {
    await pool.query("delete from audit_events where target_type = 'session' and target_id = any($1::text[])", [ids]);
    await pool.query("delete from sessions where id = any($1::uuid[])", [ids]);
  }
  await pool.end();
});

describe("Phase 1 public HTTP route certification", () => {
  it("keeps unauthenticated users outside protected pages and APIs", async () => {
    const loginPage = await request("/login");
    expect(loginPage.status).toBe(200);
    const loginHtml = await loginPage.text();
    expect(loginHtml).toContain("Temporary mock authentication");
    expect(loginHtml).not.toContain('href="/map"');
    expect(loginHtml).not.toContain('href="/audit"');

    for (const path of ["/dashboard", "/map", "/audit", "/profile"]) {
      const response = await request(path);
      expect([303, 307, 308]).toContain(response.status);
      expect(response.headers.get("location")).toBe("/login");
      safeResponse(await response.text());
    }
    const api = await request("/api/foundation/scope/team:alpha");
    expect(api.status).toBe(401);
    safeResponse(await api.text());
  });

  it("rejects unsafe origins, malformed login input, unknown personas, and unsupported methods without state", async () => {
    const before = await pool.query("select count(*)::int as count from sessions");
    const cases: Array<[RequestInit, number]> = [
      [{ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ personaId: "mock-admin-ava" }) }, 403],
      [{ method: "POST", headers: { "Content-Type": "application/json", Origin: baseUrl }, body: "{" }, 400],
      [{ method: "POST", headers: { "Content-Type": "application/json", Origin: baseUrl }, body: JSON.stringify({}) }, 400],
      [{ method: "POST", headers: { "Content-Type": "application/json", Origin: baseUrl }, body: JSON.stringify({ personaId: "unknown-fictional-persona" }) }, 400],
    ];
    for (const [options, status] of cases) {
      const response = await request("/api/auth/mock-login", options);
      expect(response.status).toBe(status);
      safeResponse(await response.text());
    }
    expect((await request("/api/auth/mock-login")).status).toBe(405);
    const after = await pool.query("select count(*)::int as count from sessions");
    expect(after.rows[0].count).toBe(before.rows[0].count);
  });

  for (const persona of personas) {
    it(`${persona.displayName} receives only the certified role and scope access`, async () => {
      const session = await login(persona.id);
      expect(session.role).toBe(persona.role);
      const dashboard = await request("/dashboard", { headers: { Cookie: session.cookie } });
      expect(dashboard.status).toBe(200);
      const navigationHtml = await dashboard.text();
      expect(navigationHtml).toContain(persona.displayName);
      expect(navigationHtml).toContain("Ticket System");
      expect(navigationHtml).toContain('aria-disabled="true"');

      for (const moduleKey of moduleKeys) {
        const allowed = persona.allowedModules.includes(moduleKey);
        const refusal = (persona.refusalModules ?? []).includes(moduleKey);
        expect(navigationHtml.includes(`href="/${moduleKey}"`), `${persona.id} navigation for ${moduleKey}`).toBe(allowed);
        const page = await request(`/${moduleKey}`, { headers: { Cookie: session.cookie } });
        expect(page.status, `${persona.id} direct page /${moduleKey}`).toBe(allowed || refusal ? 200 : 404);
        const html = await page.text();
        // A refusal page must be an explicit no-data statement, never a management projection.
        if (refusal) expect(html, `${persona.id} refusal page /${moduleKey}`).toContain("management-only");
        safeResponse(html, session.token);
      }

      await assertScope(session.cookie, "team:alpha", persona.alphaStatus);
      await assertScope(session.cookie, "team:bravo", persona.bravoStatus);

      const startEvent = await pool.query(
        "select actor_user_id, actor_role::text as actor_role, action, target_id, metadata, occurred_at from audit_events where target_id = $1 and action = 'auth.mock_session.started'",
        [session.sessionId],
      );
      expect(startEvent.rowCount).toBe(1);
      expect(startEvent.rows[0]).toMatchObject({ actor_user_id: persona.id, actor_role: persona.role, action: "auth.mock_session.started", target_id: session.sessionId, metadata: {} });
      expect(startEvent.rows[0].occurred_at).toBeInstanceOf(Date);
      expect(JSON.stringify(startEvent.rows[0].metadata)).not.toContain(session.token);

      const logoutResponse = await logout(session.cookie);
      expect(logoutResponse.status).toBe(200);
      expect((await logoutResponse.json()).ok).toBe(true);
      expect(logoutResponse.headers.get("set-cookie")?.toLowerCase()).toContain("max-age=0");
      const stored = await pool.query("select revoked_at from sessions where id = $1", [session.sessionId]);
      expect(stored.rows[0].revoked_at).toBeInstanceOf(Date);
      const endEvent = await pool.query("select actor_user_id, action, target_id, metadata from audit_events where target_id = $1 and action = 'auth.mock_session.ended'", [session.sessionId]);
      expect(endEvent.rowCount).toBe(1);
      expect(endEvent.rows[0]).toMatchObject({ actor_user_id: persona.id, action: "auth.mock_session.ended", target_id: session.sessionId, metadata: {} });

      const reusedPage = await request("/dashboard", { headers: { Cookie: session.cookie } });
      expect([303, 307, 308]).toContain(reusedPage.status);
      expect((await request("/api/foundation/scope/team:alpha", { headers: { Cookie: session.cookie } })).status).toBe(401);
    }, 20_000);
  }

  it("rejects malformed and unknown scope references server-side", async () => {
    const session = await login("mock-super-admin-nora");
    for (const scope of ["not-a-scope", "unknown:alpha", "team:Alpha", "team:alpha:extra"]) {
      const response = await request(`/api/foundation/scope/${scope}`, { headers: { Cookie: session.cookie } });
      expect(response.status).toBe(400);
      safeResponse(await response.text(), session.token);
    }
    expect((await request("/api/foundation/scope/team:alpha", { method: "POST", headers: { Cookie: session.cookie } })).status).toBe(405);
    expect((await logout(session.cookie)).status).toBe(200);
  });

  it("fails closed for forged, expired, revoked, and session-version-invalidated cookies", async () => {
    const forged = `scopeis_session=${randomBytes(32).toString("base64url")}`;
    expect((await request("/api/foundation/scope/team:alpha", { headers: { Cookie: forged } })).status).toBe(401);

    const expired = await login("mock-employee-cora");
    await pool.query("update sessions set expires_at = now() - interval '1 minute' where id = $1", [expired.sessionId]);
    expect((await request("/api/foundation/scope/team:alpha", { headers: { Cookie: expired.cookie } })).status).toBe(401);

    const versioned = await login("mock-employee-dan");
    const user = await pool.query("select session_version from users where id = $1", ["mock-employee-dan"]);
    const originalVersion = user.rows[0].session_version;
    try {
      await pool.query("update users set session_version = session_version + 1 where id = $1", ["mock-employee-dan"]);
      expect((await request("/dashboard", { headers: { Cookie: versioned.cookie } })).status).toBe(307);
    } finally {
      await pool.query("update users set session_version = $2 where id = $1", ["mock-employee-dan", originalVersion]);
    }
    expect((await logout(versioned.cookie)).status).toBe(200);
    expect((await request("/api/foundation/scope/team:bravo", { headers: { Cookie: versioned.cookie } })).status).toBe(401);
  });

  it("keeps concurrent Admin sessions isolated in both scope directions", async () => {
    const [alpha, bravo] = await Promise.all([login("mock-admin-ava"), login("mock-admin-ben")]);
    const [alphaOwn, alphaCross, bravoCross, bravoOwn] = await Promise.all([
      request("/api/foundation/scope/team:alpha", { headers: { Cookie: alpha.cookie } }),
      request("/api/foundation/scope/team:bravo", { headers: { Cookie: alpha.cookie } }),
      request("/api/foundation/scope/team:alpha", { headers: { Cookie: bravo.cookie } }),
      request("/api/foundation/scope/team:bravo", { headers: { Cookie: bravo.cookie } }),
    ]);
    expect([alphaOwn.status, alphaCross.status, bravoCross.status, bravoOwn.status]).toEqual([200, 403, 403, 200]);
    await Promise.all([logout(alpha.cookie), logout(bravo.cookie)]);
  });

  it("rejects a temporarily disabled fictional persona without creating session or audit state", async () => {
    const personaId = "mock-admin-ava";
    const beforeSessions = await pool.query("select count(*)::int as count from sessions where user_id = $1", [personaId]);
    const beforeAudits = await pool.query("select count(*)::int as count from audit_events where actor_user_id = $1 and action = 'auth.mock_session.started'", [personaId]);
    try {
      await pool.query("update users set active = false where id = $1", [personaId]);
      const response = await request("/api/auth/mock-login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: baseUrl },
        body: JSON.stringify({ personaId }),
      });
      expect(response.status).toBe(401);
      safeResponse(await response.text());
    } finally {
      await pool.query("update users set active = true where id = $1", [personaId]);
    }
    const afterSessions = await pool.query("select count(*)::int as count from sessions where user_id = $1", [personaId]);
    const afterAudits = await pool.query("select count(*)::int as count from audit_events where actor_user_id = $1 and action = 'auth.mock_session.started'", [personaId]);
    expect(afterSessions.rows[0].count).toBe(beforeSessions.rows[0].count);
    expect(afterAudits.rows[0].count).toBe(beforeAudits.rows[0].count);
  });

  it("keeps private evidence files and uploads unauthorized for anonymous and unscoped callers", async () => {
    const unknownEvidence = "00000000-0000-4000-8000-000000000999";
    const anonymous = await request(`/api/evidence/files/${unknownEvidence}`);
    expect(anonymous.status).toBe(401);
    safeResponse(await anonymous.text());

    const employee = await login("mock-employee-cora");
    const missing = await request(`/api/evidence/files/${unknownEvidence}`, { headers: { Cookie: employee.cookie } });
    expect(missing.status).toBe(404);
    safeResponse(await missing.text(), employee.token);

    // A traversal-shaped or guessed identifier never resolves to a storage object.
    const traversal = await request("/api/evidence/files/..%2F..%2Fetc%2Fpasswd", { headers: { Cookie: employee.cookie } });
    expect([400, 404]).toContain(traversal.status);
    safeResponse(await traversal.text(), employee.token);

    const missingOrigin = await request(`/api/evidence/${unknownEvidence}/files`, { method: "POST", headers: { Cookie: employee.cookie } });
    expect(missingOrigin.status).toBe(403);
    // A well-formed upload for an unknown evidence id is a non-enumerating not-found, not a leak.
    const upload = new FormData();
    upload.set("expectedVersion", "1");
    upload.set("file", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "Fictional.pdf", { type: "application/pdf" }));
    const denied = await request(`/api/evidence/${unknownEvidence}/files`, { method: "POST", headers: { Cookie: employee.cookie, Origin: baseUrl }, body: upload });
    expect(denied.status).toBe(404);
    safeResponse(await denied.text(), employee.token);
    await logout(employee.cookie);
  });

});
