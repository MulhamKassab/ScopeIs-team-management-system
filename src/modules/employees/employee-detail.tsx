import Link from "next/link";
import type { ManagementEmployeeDetail } from "@/modules/employees/employee-services";

function teamLabel(team: string | null) { return team ? team.replace(/^team:/, "").replace(/[-_]+/g, " ") : "Unassigned"; }
function value(value: string | null | undefined) { return value || "Not recorded"; }

export function EmployeeDetail({ employee, canManage, managementPanel }: { employee: ManagementEmployeeDetail; canManage: boolean; managementPanel?: React.ReactNode }) {
  const fields = [
    ["Employee code", employee.employeeCode], ["System role", employee.user.role], ["Status", employee.user.active ? "Active" : "Inactive"],
    ["Designation", value(employee.designationName)], ["Manager", value(employee.managerName)], ["Team", teamLabel(employee.team)], ["Working pattern", value(employee.workingPattern)],
  ];
  if ("workEmail" in employee) fields.push(["Work email", value(employee.workEmail)], ["Work phone", value(employee.workPhone)], ["Professional summary", value(employee.professionalSummary)], ["Default work location", value(employee.defaultWorkLocation)]);
  return <section className="employee-detail" aria-labelledby="employee-detail-title">
    <p className="eyebrow">Phase 2 · Workforce</p><h2 id="employee-detail-title">{employee.user.displayName}</h2>
    <p className="directory-intro">Authorized employee record.</p><Link href="/employees" className="button directory-clear">Back to directory</Link>
    {canManage ? <p className="employee-detail-management" role="status">Management controls are available to Super Admin only.</p> : null}
    <dl>{fields.map(([label, fieldValue]) => <div key={label}><dt>{label}</dt><dd>{fieldValue}</dd></div>)}</dl>
    {managementPanel}
  </section>;
}
