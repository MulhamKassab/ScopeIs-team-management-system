"use client";

import { useActionState, useState } from "react";
import type { AccountFormAction, AccountFormState } from "./actions";

const initialState: AccountFormState = {};

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="form-error">{message}</p> : null;
}

function StatusMessage({ state }: { state: AccountFormState }) {
  return <>{state.success ? <p className="form-success" role="status">{state.success}</p> : null}{state.formError ? <p className="form-error" role="alert">{state.formError}</p> : null}</>;
}

export function PasswordNotice() {
  return <p className="account-password-notice" role="note">Passwords cannot be viewed. Set a temporary password if the user needs new credentials.</p>;
}

/** Create-account panel: workforce record plus login account, created atomically on the server. */
export function CreateAccountPanel({ action }: { action: AccountFormAction }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("EMPLOYEE");
  const [state, formAction, pending] = useActionState(action, initialState);
  if (!open) return <button className="button primary" type="button" onClick={() => setOpen(true)}>Create account</button>;
  return (
    <section className="account-panel" aria-labelledby="account-create-title">
      <div className="account-panel-heading">
        <div><h3 id="account-create-title">Create workforce record and login account</h3><PasswordNotice /></div>
        <button className="button" type="button" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
      </div>
      <form className="account-form" action={formAction} noValidate>
        <label htmlFor="account-name">Display name <span aria-hidden="true">*</span></label>
        <input id="account-name" name="displayName" type="text" autoComplete="name" maxLength={120} aria-invalid={Boolean(state.fieldErrors?.displayName)} aria-describedby={state.fieldErrors?.displayName ? "account-name-error" : undefined} />
        <FieldError id="account-name-error" message={state.fieldErrors?.displayName} />

        <label htmlFor="account-username">Username <span aria-hidden="true">*</span></label>
        <input id="account-username" name="username" type="text" autoComplete="off" maxLength={80} aria-invalid={Boolean(state.fieldErrors?.username)} />
        <FieldError id="account-username-error" message={state.fieldErrors?.username} />

        <label htmlFor="account-login-email">Login email <span aria-hidden="true">*</span></label>
        <input id="account-login-email" name="loginEmail" type="email" autoComplete="off" maxLength={254} aria-invalid={Boolean(state.fieldErrors?.loginEmail)} />
        <FieldError id="account-login-email-error" message={state.fieldErrors?.loginEmail} />

        <label htmlFor="account-work-email">Work email <span className="employee-optional">Optional</span></label>
        <input id="account-work-email" name="workEmail" type="email" autoComplete="email" maxLength={254} />

        <label htmlFor="account-role">Initial system role <span aria-hidden="true">*</span></label>
        <select id="account-role" name="role" value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="EMPLOYEE">Employee</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>

        {role === "SUPER_ADMIN" ? (
          <label className="account-check"><input type="checkbox" name="superAdminConfirmed" value="true" /> I confirm creating another Super Admin account granted global authority.</label>
        ) : null}

        <label htmlFor="account-password">Temporary password <span aria-hidden="true">*</span></label>
        <input id="account-password" name="password" type="password" autoComplete="new-password" maxLength={128} aria-invalid={Boolean(state.fieldErrors?.password)} />
        <FieldError id="account-password-error" message={state.fieldErrors?.password} />

        <label htmlFor="account-confirm-password">Confirm temporary password <span aria-hidden="true">*</span></label>
        <input id="account-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" maxLength={128} aria-invalid={Boolean(state.fieldErrors?.confirmPassword)} />
        <FieldError id="account-confirm-password-error" message={state.fieldErrors?.confirmPassword} />

        <label className="account-check"><input type="checkbox" name="mustChangePassword" value="true" defaultChecked /> Require password change at next login</label>

        <label htmlFor="account-work-phone">Work phone <span className="employee-optional">Optional</span></label>
        <input id="account-work-phone" name="workPhone" type="tel" autoComplete="tel" maxLength={40} />

        <label htmlFor="account-summary">Professional summary <span className="employee-optional">Optional</span></label>
        <textarea id="account-summary" name="professionalSummary" rows={3} maxLength={2000} />

        <StatusMessage state={state} />
        <div className="account-form-actions"><button className="button primary" type="submit" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button></div>
      </form>
    </section>
  );
}

/** Enable-sign-in panel for an existing workforce record with no credentials. */
export function EnableCredentialsPanel({ action, candidates }: { action: AccountFormAction; candidates: { userId: string; displayName: string; employeeCode: string | null }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, initialState);
  if (candidates.length === 0) return <p className="account-empty">Every workforce record already has sign-in credentials.</p>;
  if (!open) return <button className="button" type="button" onClick={() => setOpen(true)}>Enable sign-in for existing record</button>;
  return (
    <section className="account-panel" aria-labelledby="account-enable-title">
      <div className="account-panel-heading">
        <div><h3 id="account-enable-title">Enable sign-in for an existing workforce record</h3><PasswordNotice /><p className="account-help">The target keeps its current role and active state. A work email is never overwritten.</p></div>
        <button className="button" type="button" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
      </div>
      <form className="account-form" action={formAction} noValidate>
        <label htmlFor="enable-user">Workforce record <span aria-hidden="true">*</span></label>
        <select id="enable-user" name="userId" defaultValue="">
          <option value="">Choose a record</option>
          {candidates.map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidate.displayName}{candidate.employeeCode ? ` · ${candidate.employeeCode}` : ""}</option>)}
        </select>

        <label htmlFor="enable-username">Username <span aria-hidden="true">*</span></label>
        <input id="enable-username" name="username" type="text" autoComplete="off" maxLength={80} />
        <label htmlFor="enable-email">Login email <span aria-hidden="true">*</span></label>
        <input id="enable-email" name="loginEmail" type="email" autoComplete="off" maxLength={254} />
        <label htmlFor="enable-password">Temporary password <span aria-hidden="true">*</span></label>
        <input id="enable-password" name="password" type="password" autoComplete="new-password" maxLength={128} />
        <label htmlFor="enable-confirm">Confirm temporary password <span aria-hidden="true">*</span></label>
        <input id="enable-confirm" name="confirmPassword" type="password" autoComplete="new-password" maxLength={128} />
        <label className="account-check"><input type="checkbox" name="mustChangePassword" value="true" defaultChecked /> Require password change at next login</label>
        <StatusMessage state={state} />
        <div className="account-form-actions"><button className="button primary" type="submit" disabled={pending}>{pending ? "Enabling…" : "Enable sign-in"}</button></div>
      </form>
    </section>
  );
}

/** Password-reset panel. The new password is hashed immediately and never echoed back. */
export function ResetPasswordPanel({ action, row, needsCurrentPassword, anotherSuperAdmin }: { action: AccountFormAction; row: { userId: string; displayName: string; credentialVersion: number }; needsCurrentPassword: boolean; anotherSuperAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, initialState);
  if (!open) return <button className="button" type="button" onClick={() => setOpen(true)}>Reset password</button>;
  return (
    <section className="account-panel" role="group" aria-labelledby={`reset-title-${row.userId}`}>
      <div className="account-panel-heading">
        <div><h3 id={`reset-title-${row.userId}`}>Reset password for {row.displayName}</h3><PasswordNotice /></div>
        <button className="button" type="button" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
      </div>
      <form className="account-form" action={formAction} noValidate>
        <input type="hidden" name="userId" value={row.userId} />
        <input type="hidden" name="expectedVersion" value={row.credentialVersion} />
        <label htmlFor={`reset-password-${row.userId}`}>New temporary password <span aria-hidden="true">*</span></label>
        <input id={`reset-password-${row.userId}`} name="password" type="password" autoComplete="new-password" maxLength={128} />
        <label htmlFor={`reset-confirm-${row.userId}`}>Confirm temporary password <span aria-hidden="true">*</span></label>
        <input id={`reset-confirm-${row.userId}`} name="confirmPassword" type="password" autoComplete="new-password" maxLength={128} />
        <label className="account-check"><input type="checkbox" name="mustChangePassword" value="true" defaultChecked /> Require password change at next login</label>
        <label className="account-check"><input type="checkbox" name="confirmRevoke" value="true" /> I understand all existing sessions for this account will be revoked.</label>
        {needsCurrentPassword ? <>
          <label htmlFor={`reset-current-${row.userId}`}>Your current password <span aria-hidden="true">*</span></label>
          <input id={`reset-current-${row.userId}`} name="currentPassword" type="password" autoComplete="current-password" maxLength={128} />
        </> : null}
        {anotherSuperAdmin ? <label className="account-check"><input type="checkbox" name="highRiskConfirmed" value="true" /> I confirm resetting another Super Admin account.</label> : null}
        <StatusMessage state={state} />
        <div className="account-form-actions"><button className="button primary" type="submit" disabled={pending}>{pending ? "Resetting…" : "Reset password"}</button></div>
      </form>
    </section>
  );
}

/** Self-only password change used for a required temporary-password change and ordinary changes. */
export function ChangePasswordForm({ action, required }: { action: AccountFormAction; required: boolean }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form className="account-form" action={formAction} noValidate>
      {required ? <p className="account-help" role="status">You are signed in with a temporary password. Set a new password to continue.</p> : null}
      <label htmlFor="change-current">Current password <span aria-hidden="true">*</span></label>
      <input id="change-current" name="currentPassword" type="password" autoComplete="current-password" maxLength={128} />
      <label htmlFor="change-new">New password <span aria-hidden="true">*</span></label>
      <input id="change-new" name="newPassword" type="password" autoComplete="new-password" maxLength={128} />
      <label htmlFor="change-confirm">Confirm new password <span aria-hidden="true">*</span></label>
      <input id="change-confirm" name="confirmPassword" type="password" autoComplete="new-password" maxLength={128} />
      <StatusMessage state={state} />
      <div className="account-form-actions"><button className="button primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Change password"}</button></div>
    </form>
  );
}
