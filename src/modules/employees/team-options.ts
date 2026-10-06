import "server-only";
import { db } from "@/db/client";
import { adminScopeGrants, employeeProfiles, teams } from "@/db/schema";
import { asc, eq, isNotNull } from "drizzle-orm";

/** Keep historical references readable, including fixtures imported after migration. */
export async function listTeamOptions() {
  const [catalogue, profiles, grants] = await Promise.all([db.select({ id: teams.id, name: teams.name, version: teams.version }).from(teams).orderBy(asc(teams.name)), db.selectDistinct({ id: employeeProfiles.team }).from(employeeProfiles).where(isNotNull(employeeProfiles.team)), db.selectDistinct({ id: adminScopeGrants.scopeReference }).from(adminScopeGrants).where(eq(adminScopeGrants.scopeType, "TEAM"))]);
  const names = new Map(catalogue.map((team) => [team.id, team]));
  for (const { id } of [...profiles, ...grants]) if (id && !names.has(id)) names.set(id, { id, name: id.replace(/^team:/i, "").replace(/[-_:]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()), version: 0 });
  return [...names.values()].sort((a, b) => a.name.localeCompare(b.name));
}
