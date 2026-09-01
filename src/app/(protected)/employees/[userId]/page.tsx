import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { can } from "@/modules/authorization/authorization-service";
import { EmployeeDetail } from "@/modules/employees/employee-detail";
import { EmployeeManagementPanel } from "@/modules/employees/employee-management-panel";
import { EmployeeDomainError } from "@/modules/employees/domain-error";
import { employeeProfileService, type ManagementEmployeeDetail } from "@/modules/employees/employee-services";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (!can(actor, "module:employees:view")) notFound();
  let employee: ManagementEmployeeDetail;
  try {
    employee = await employeeProfileService.getManagementDetail(actor, (await params).userId);
  } catch (error) {
    if (error instanceof EmployeeDomainError && ["NOT_FOUND", "OUT_OF_SCOPE", "FORBIDDEN"].includes(error.code)) notFound();
    throw error;
  }
  const options = actor.role === "SUPER_ADMIN" ? await employeeProfileService.listManagementFormOptions(actor, employee.userId) : undefined;
  return <EmployeeDetail employee={employee} canManage={actor.role === "SUPER_ADMIN"} managementPanel={options ? <EmployeeManagementPanel employee={employee} options={options} /> : undefined} />;
}
