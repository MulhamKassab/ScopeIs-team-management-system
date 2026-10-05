"use client";

import { useActionState } from "react";
import { TaskDialog } from "@/shared/components/task-dialog";
import Link from "next/link";
import type { CreateEmployeeFormAction, CreateEmployeeFormState } from "@/modules/employees/employee-create-action";

const initialCreateEmployeeFormState: CreateEmployeeFormState = {};

export function EmployeeCreatePanel({ action }: { action: CreateEmployeeFormAction }) {
  return <TaskDialog triggerLabel="Add employee" title="Add employee" description="Create a workforce record. Login access can be enabled separately from Account administration." triggerClassName="button primary"><EmployeeCreateForm action={action} /></TaskDialog>;
}

function EmployeeCreateForm({ action }: { action: CreateEmployeeFormAction }) {
  const [state, formAction, pending] = useActionState(action, initialCreateEmployeeFormState);

  return (
    <div className="people-task-content">
      <p className="operation-help">Need a record and login together? Use <Link href="/accounts">Create account</Link> instead.</p>
      <form className="employee-create-form" action={formAction} noValidate>
        <label htmlFor="employee-display-name">Employee name <span aria-hidden="true">*</span></label>
        <input id="employee-display-name" name="displayName" type="text" autoComplete="name" maxLength={120} aria-invalid={Boolean(state.fieldErrors?.displayName)} aria-describedby={state.fieldErrors?.displayName ? "employee-display-name-error" : undefined} />
        {state.fieldErrors?.displayName ? <p id="employee-display-name-error" className="employee-form-error">{state.fieldErrors.displayName}</p> : null}

        <p className="employee-code-notice" role="status">Employee code is assigned automatically by the server after creation.</p>

        <label htmlFor="employee-work-email">Work email <span className="employee-optional">Optional</span></label>
        <input id="employee-work-email" name="workEmail" type="email" autoComplete="email" maxLength={254} aria-invalid={Boolean(state.fieldErrors?.workEmail)} aria-describedby={state.fieldErrors?.workEmail ? "employee-work-email-error" : undefined} />
        {state.fieldErrors?.workEmail ? <p id="employee-work-email-error" className="employee-form-error">{state.fieldErrors.workEmail}</p> : null}

        <label htmlFor="employee-work-phone">Work phone <span className="employee-optional">Optional</span></label>
        <input id="employee-work-phone" name="workPhone" type="tel" autoComplete="tel" maxLength={40} aria-invalid={Boolean(state.fieldErrors?.workPhone)} aria-describedby={state.fieldErrors?.workPhone ? "employee-work-phone-error" : undefined} />
        {state.fieldErrors?.workPhone ? <p id="employee-work-phone-error" className="employee-form-error">{state.fieldErrors.workPhone}</p> : null}

        <label htmlFor="employee-professional-summary">Professional summary <span className="employee-optional">Optional</span></label>
        <textarea id="employee-professional-summary" name="professionalSummary" rows={4} maxLength={2000} aria-invalid={Boolean(state.fieldErrors?.professionalSummary)} aria-describedby={state.fieldErrors?.professionalSummary ? "employee-professional-summary-error" : undefined} />
        {state.fieldErrors?.professionalSummary ? <p id="employee-professional-summary-error" className="employee-form-error">{state.fieldErrors.professionalSummary}</p> : null}

        {state.formError ? <p className="employee-form-error" role="alert">{state.formError}</p> : null}
        <div className="employee-create-actions"><button className="button primary" type="submit" disabled={pending}>{pending ? "Creating employee…" : "Create employee"}</button></div>
      </form>
    </div>
  );
}
