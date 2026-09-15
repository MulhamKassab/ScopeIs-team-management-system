import "dotenv/config";
import { db } from "@/db/client";
import { adminScopeGrants, users } from "@/db/schema";
import { mockPersonas } from "@/db/seed/fixtures";
import { env, mockAuthenticationIsAllowed } from "@/server/env";

async function seed() {
  if (env().APP_ENV === "production" && !mockAuthenticationIsAllowed()) {
    throw new Error("Production fixture seeding requires MOCK_AUTH_ENABLED=true.");
  }
  await db.transaction(async (tx) => {
    for (const persona of mockPersonas) {
      await tx.insert(users).values({ id: persona.id, displayName: persona.displayName, role: persona.role })
        .onConflictDoNothing();
      if (persona.role === "ADMIN" && persona.scopes.length) {
        await tx.insert(adminScopeGrants).values(persona.scopes.map((scope) => ({ userId: persona.id, scopeType: scope.type, scopeReference: scope.reference }))).onConflictDoNothing();
      }
    }
  });
  process.stdout.write(`Seeded ${mockPersonas.length} fictional mock personas.\n`);
}

seed().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
