import { IconArrowLeft, IconInfoCircle, IconLock, IconUser } from "@tabler/icons-react";
import Link from "next/link";
import type { ManagementEmployeeDetail } from "@/modules/employees/employee-services";

function teamLabel(team: string | null) { return team ? team.replace(/^team:/, "").replace(/[-_]+/g, " ") : "Unassigned"; }
function value(value: string | null | undefined) { return value || "Not recorded"; }
function initials(name: string) { return name.split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase(); }

export function EmployeeDetail({ employee, canManage, managementPanel }: { employee: ManagementEmployeeDetail; canManage: boolean; managementPanel?: React.ReactNode }) {
  const fields = [
    ["Employee code", employee.employeeCode], ["System role", employee.user.role], ["Status", employee.user.active ? "Active" : "Inactive"],
    ["Designation", value(employee.designationName)], ["Manager", value(employee.managerName)], ["Team", teamLabel(employee.team)], ["Working pattern", value(employee.workingPattern)],
  ];
  if ("workEmail" in employee) fields.push(["Work email", value(employee.workEmail)], ["Work phone", value(employee.workPhone)], ["Professional summary", value(employee.professionalSummary)], ["Default work location", value(employee.defaultWorkLocation)]);
  return <section className="employee-detail" aria-labelledby="employee-detail-title">
    <Link href="/employees" className="back-link"><IconArrowLeft aria-hidden="true" />Back to directory</Link>
    <header className="employee-profile-header">
      <span className="profile-avatar" aria-hidden="true">{initials(employee.user.displayName)}</span>
      <div><p className="eyebrow">Phase 2 · Workforce</p><h1 id="employee-detail-title">{employee.user.displayName}</h1><p>{employee.designationName ?? "Designation not assigned"} · {teamLabel(employee.team)}</p></div>
      <span className={`directory-status ${employee.user.active ? "active" : "inactive"}`}>{employee.user.active ? "Active" : "Inactive"}</span>
    </header>
    {canManage ? <p className="employee-detail-management" role="status"><IconInfoCircle aria-hidden="true" />Management controls are available to Super Admin only.</p> : <p className="employee-detail-management privacy" role="status"><IconLock aria-hidden="true" />This read-only record respects your authorized TEAM scope and protected-field projection.</p>}
    <section className="detail-card" aria-labelledby="employment-details-title"><div className="panel-heading"><div><p className="eyebrow">Employee record</p><h2 id="employment-details-title">Employment details</h2></div><span className="card-icon"><IconUser aria-hidden="true" /></span></div><dl>{fields.map(([label, fieldValue]) => <div key={label}><dt>{label}</dt><dd>{fieldValue}</dd></div>)}</dl></section>
    {managementPanel}
  </section>;
}
