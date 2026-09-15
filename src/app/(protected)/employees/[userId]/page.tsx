import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { can } from "@/modules/authorization/authorization-service";
import { EmployeeDetail } from "@/modules/employees/employee-detail";
import { EmployeeManagementPanel } from "@/modules/employees/employee-management-panel";
import { EmployeeDomainError } from "@/modules/employees/domain-error";
import { employeeProfileService, type ManagementEmployeeDetail } from "@/modules/employees/employee-services";
import { CertificationSummaryPanel, EvidenceReviewPanel } from "@/modules/evidence/forms";
import { evidenceRepository } from "@/modules/evidence/repositories";
import { evidenceService } from "@/modules/evidence/service";
import { db } from "@/db/client";

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
  // Phase 9 evidence: Super Admin gets the full review surface; a scoped Admin gets the locked certification summary only.
  const [evidence, skills] = await Promise.all([evidenceService.listForEmployee(actor, employee.userId), evidenceRepository.activeSkillOptions(db)]);
  const evidencePanel = evidence.full
    ? <EvidenceReviewPanel items={evidence.full} skills={skills} employeeUserId={employee.userId} employeeName={employee.user.displayName} />
    : evidence.certificationSummary
      ? <CertificationSummaryPanel rows={evidence.certificationSummary} employeeName={employee.user.displayName} />
      : undefined;
  return <><EmployeeDetail employee={employee} canManage={actor.role === "SUPER_ADMIN"} managementPanel={options ? <EmployeeManagementPanel employee={employee} options={options} /> : undefined} />{evidencePanel}</>;
}
