import { listTeamOptions } from "@/modules/employees/team-options";
import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { can } from "@/modules/authorization/authorization-service";
import { EmployeeDirectory } from "@/modules/employees/employee-directory";
import { createEmployeeAction } from "@/modules/employees/employee-create-action";
import { parseEmployeeDirectorySearchParams, type DirectorySearchParams } from "@/modules/employees/employee-directory-query";
import { employeeProfileService } from "@/modules/employees/employee-services";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<DirectorySearchParams> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (!can(actor, "module:employees:view")) notFound();
  const parsed = parseEmployeeDirectorySearchParams(await searchParams);
  const filterOptions = await employeeProfileService.listDirectoryFilterOptions(actor);
  const directory = parsed.valid ? await employeeProfileService.listDirectoryProfiles(actor, parsed.query) : { items: [] };
  const teamNames = Object.fromEntries((await listTeamOptions()).filter((team) => filterOptions.teams.includes(team.id)).map((team) => [team.id, team.name]));
  return <EmployeeDirectory teamNames={teamNames} profiles={directory.items} filters={parsed.filters} filterOptions={filterOptions} invalidQuery={!parsed.valid} createEmployeeAction={actor.role === "SUPER_ADMIN" ? createEmployeeAction : undefined} canManage={actor.role === "SUPER_ADMIN"} />;
}
