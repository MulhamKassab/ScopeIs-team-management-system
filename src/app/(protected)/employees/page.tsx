import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { can } from "@/modules/authorization/authorization-service";
import { EmployeeDirectory } from "@/modules/employees/employee-directory";
import { employeeProfileService } from "@/modules/employees/employee-services";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (!can(actor, "module:employees:view")) notFound();
  const directory = await employeeProfileService.listDirectoryProfiles(actor);
  return <EmployeeDirectory profiles={directory.items} />;
}
