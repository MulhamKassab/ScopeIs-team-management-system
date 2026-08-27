import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { adminScopeGrants, users } from "@/db/schema";
import { mockPersonas } from "@/db/seed/fixtures";

async function seed() {
  await db.transaction(async (tx) => {
    for (const persona of mockPersonas) {
      await tx.insert(users).values({ id: persona.id, displayName: persona.displayName, role: persona.role })
        .onConflictDoUpdate({ target: users.id, set: { displayName: persona.displayName, role: persona.role, active: true, updatedAt: new Date() } });
      await tx.delete(adminScopeGrants).where(eq(adminScopeGrants.userId, persona.id));
      if (persona.scopes.length) {
        await tx.insert(adminScopeGrants).values(persona.scopes.map((scope) => ({ userId: persona.id, scopeType: scope.type, scopeReference: scope.reference })));
      }
    }
  });
  process.stdout.write(`Seeded ${mockPersonas.length} fictional mock personas.\n`);
}

seed().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
