"use client";

import { IconInfoCircle, IconPlus, IconX } from "@tabler/icons-react";
import { useActionState, useState } from "react";
import type { CreateEmployeeFormAction, CreateEmployeeFormState } from "@/modules/employees/employee-create-action";

const initialCreateEmployeeFormState: CreateEmployeeFormState = {};

export function EmployeeCreatePanel({ action }: { action: CreateEmployeeFormAction }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, initialCreateEmployeeFormState);
  if (!open) return <button className="button primary directory-create-trigger" type="button" onClick={() => setOpen(true)}><IconPlus aria-hidden="true" />Add employee</button>;

  return (
    <section className="employee-create-panel" aria-labelledby="employee-create-title">
      <div className="employee-create-heading">
        <div><h3 id="employee-create-title">Add employee</h3><p>Create a workforce record only. It does not create access, a session, an invitation, or a mock-login account.</p></div>
        <button className="icon-button" aria-label="Close employee form" type="button" onClick={() => setOpen(false)} disabled={pending}><IconX aria-hidden="true" /></button>
      </div>
      <form className="employee-create-form" action={formAction} noValidate>
        <p className="employee-code-notice" role="status"><IconInfoCircle aria-hidden="true" />Employee code is assigned automatically by the server after creation.</p>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="employee-display-name">Employee name <span aria-hidden="true">*</span></label><input id="employee-display-name" name="displayName" type="text" autoComplete="name" maxLength={120} aria-invalid={Boolean(state.fieldErrors?.displayName)} aria-describedby={state.fieldErrors?.displayName ? "employee-display-name-error" : undefined} />{state.fieldErrors?.displayName ? <p id="employee-display-name-error" className="employee-form-error">{state.fieldErrors.displayName}</p> : null}</div>
          <div className="form-field"><label htmlFor="employee-work-email">Work email <span className="employee-optional">Optional</span></label><input id="employee-work-email" name="workEmail" type="email" autoComplete="email" maxLength={254} aria-invalid={Boolean(state.fieldErrors?.workEmail)} aria-describedby={state.fieldErrors?.workEmail ? "employee-work-email-error" : undefined} />{state.fieldErrors?.workEmail ? <p id="employee-work-email-error" className="employee-form-error">{state.fieldErrors.workEmail}</p> : null}</div>
          <div className="form-field"><label htmlFor="employee-work-phone">Work phone <span className="employee-optional">Optional</span></label><input id="employee-work-phone" name="workPhone" type="tel" autoComplete="tel" maxLength={40} aria-invalid={Boolean(state.fieldErrors?.workPhone)} aria-describedby={state.fieldErrors?.workPhone ? "employee-work-phone-error" : undefined} />{state.fieldErrors?.workPhone ? <p id="employee-work-phone-error" className="employee-form-error">{state.fieldErrors.workPhone}</p> : null}</div>
          <div className="form-field field-wide"><label htmlFor="employee-professional-summary">Professional summary <span className="employee-optional">Optional</span></label><textarea id="employee-professional-summary" name="professionalSummary" rows={4} maxLength={2000} aria-invalid={Boolean(state.fieldErrors?.professionalSummary)} aria-describedby={state.fieldErrors?.professionalSummary ? "employee-professional-summary-error" : undefined} />{state.fieldErrors?.professionalSummary ? <p id="employee-professional-summary-error" className="employee-form-error">{state.fieldErrors.professionalSummary}</p> : null}</div>
        </div>

        {state.formError ? <p className="employee-form-error" role="alert">{state.formError}</p> : null}
        <div className="employee-create-actions"><button className="button primary" type="submit" disabled={pending}>{pending ? "Creating employee…" : "Create employee"}</button></div>
      </form>
    </section>
  );
}
