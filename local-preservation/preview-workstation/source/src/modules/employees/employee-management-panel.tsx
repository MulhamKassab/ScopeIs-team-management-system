"use client";

import { IconInfoCircle, IconLockAccess, IconUserCog } from "@tabler/icons-react";
import { useActionState } from "react";
import type { ManagementEmployeeDetail } from "@/modules/employees/employee-services";
import {
  grantAdminScopeAction,
  revokeAdminScopeAction,
  setEmployeeLifecycleAction,
  updateEmployeeAssignmentsAction,
  updateEmployeeBasicAction,
  updateEmployeeRoleAction,
  type EmployeeMutationAction,
  type EmployeeMutationState,
} from "@/modules/employees/employee-management-actions";

const initial: EmployeeMutationState = {};

function Feedback({ state }: { state: EmployeeMutationState }) {
  return state.error ? <p className="employee-form-error" role="alert">{state.error}</p> : state.success ? <p className="employee-form-success" role="status">{state.success}</p> : null;
}

function ManagedForm({ action, children, label, submitLabel = "Save changes", danger = false, className = "" }: { action: EmployeeMutationAction; children: React.ReactNode; label: string; submitLabel?: string; danger?: boolean; className?: string }) {
  const [state, formAction, pending] = useActionState(action, initial);
  return <form action={formAction} className={`employee-management-form ${className}`} aria-label={label}>
    {children}
    <Feedback state={state} />
    <button className={`button ${danger ? "danger" : "primary"}`} type="submit" disabled={pending} onClick={danger ? (event) => {
      if (!window.confirm(submitLabel === "Deactivate employee" ? "Deactivate this employee and revoke their active sessions?" : "Reactivate this employee?")) event.preventDefault();
    } : undefined}>{pending ? "Saving…" : submitLabel}</button>
  </form>;
}

export function EmployeeManagementPanel({ employee, options }: { employee: ManagementEmployeeDetail; options: { designations: { id: string; name: string }[]; managers: { userId: string; displayName: string }[]; scopes: { id: string; scopeReference: string; active: boolean; version: number }[] } }) {
  const hidden = <><input type="hidden" name="userId" value={employee.userId} /><input type="hidden" name="expectedVersion" value={employee.version} /></>;
  const activeScopes = options.scopes.filter((scope) => scope.active);

  return <section className="employee-management-panel" aria-labelledby="employee-management-title">
    <div className="panel-heading">
      <div><p className="eyebrow">Restricted management</p><h2 id="employee-management-title">Super Admin controls</h2></div>
      <span className="card-icon"><IconUserCog aria-hidden="true" /></span>
    </div>
    <p className="management-note"><IconInfoCircle aria-hidden="true" />System role, employee team, and explicit Admin TEAM scope remain separate.</p>

    <div className="management-grid">
      <ManagedForm action={updateEmployeeBasicAction} label="Edit basic employee information" className="management-wide">
        <div className="form-heading"><h3>Edit basic employee information</h3><p>Update the employee’s identity and professional contact details.</p></div>
        {hidden}
        <p className="employee-code-notice"><IconLockAccess aria-hidden="true" />Employee code <strong>{employee.employeeCode}</strong> is assigned by the server and cannot be edited.</p>
        <div className="form-grid">
          <label>Display name<input name="displayName" defaultValue={employee.user.displayName} maxLength={120} required /></label>
          <label>Work email<input name="workEmail" type="email" defaultValue={employee.workEmail ?? ""} maxLength={254} /></label>
          <label>Work phone<input name="workPhone" defaultValue={employee.workPhone ?? ""} maxLength={40} /></label>
          <label className="field-wide">Professional summary<textarea name="professionalSummary" defaultValue={employee.professionalSummary ?? ""} maxLength={2000} rows={3} /></label>
        </div>
      </ManagedForm>

      <ManagedForm action={updateEmployeeAssignmentsAction} label="Employee assignments" className="management-wide">
        <div className="form-heading"><h3>Assignments</h3><p>Manage independent job, reporting, team, and working-pattern fields.</p></div>
        {hidden}
        <div className="form-grid">
          <label>Designation<select name="designationId" defaultValue={employee.designationId ?? ""}><option value="">Unassigned</option>{options.designations.map((designation) => <option key={designation.id} value={designation.id}>{designation.name}</option>)}</select></label>
          <label>Manager<select name="managerUserId" defaultValue={employee.managerUserId ?? ""}><option value="">No manager</option>{options.managers.map((manager) => <option key={manager.userId} value={manager.userId}>{manager.displayName}</option>)}</select></label>
          <label>Team<input name="team" defaultValue={employee.team ?? ""} placeholder="team:alpha" maxLength={120} /></label>
          <label>Working pattern <span className="employee-optional">informational only</span><input name="workingPattern" defaultValue={employee.workingPattern ?? ""} maxLength={120} /></label>
        </div>
      </ManagedForm>

      <ManagedForm action={updateEmployeeRoleAction} label="Change system role">
        <div className="form-heading"><h3>System role</h3><p>Role changes revoke existing sessions and never grant TEAM scope.</p></div>
        {hidden}
        <label>System role<select name="role" defaultValue={employee.user.role}><option value="SUPER_ADMIN">Super Admin</option><option value="ADMIN">Admin</option><option value="EMPLOYEE">Employee</option></select></label>
      </ManagedForm>

      <ManagedForm action={setEmployeeLifecycleAction} label="Employee lifecycle" submitLabel={employee.user.active ? "Deactivate employee" : "Reactivate employee"} danger>
        <div className="form-heading"><h3>Employee lifecycle</h3><p>{employee.user.active ? "Deactivate instead of permanently deleting this record. Active sessions are revoked." : "Reactivation restores only active status."}</p></div>
        {hidden}
        <input type="hidden" name="active" value={String(!employee.user.active)} />
      </ManagedForm>

      {employee.user.role === "ADMIN" ? <section className="employee-scope-controls management-wide" aria-labelledby="employee-scope-title">
        <div className="form-heading"><h3 id="employee-scope-title">Admin TEAM scope</h3><p>Scope is explicit and independent from the employee’s team or system role.</p></div>
        <ManagedForm action={grantAdminScopeAction} label="Grant Admin TEAM scope">
          {hidden}
          <label>TEAM scope<input name="team" placeholder="team:alpha" maxLength={120} required /></label>
        </ManagedForm>
        {activeScopes.length ? <ul>{activeScopes.map((scope) => <li key={scope.id}><span>{scope.scopeReference}</span><ManagedForm action={revokeAdminScopeAction} label={`Revoke ${scope.scopeReference}`} submitLabel="Revoke scope"><input type="hidden" name="userId" value={employee.userId} /><input type="hidden" name="grantId" value={scope.id} /><input type="hidden" name="expectedVersion" value={scope.version} /></ManagedForm></li>)}</ul> : <p className="scope-empty">No active TEAM scopes.</p>}
      </section> : null}
    </div>
  </section>;
}
