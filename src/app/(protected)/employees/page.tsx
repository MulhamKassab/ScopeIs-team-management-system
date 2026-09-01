import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { can } from "@/modules/authorization/authorization-service";
import { EmployeeDirectory } from "@/modules/employees/employee-directory";
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
  return <EmployeeDirectory profiles={directory.items} filters={parsed.filters} filterOptions={filterOptions} invalidQuery={!parsed.valid} />;
}
