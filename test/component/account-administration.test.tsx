// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { AccountTable } from "@/modules/account-administration/table";
import { CreateAccountPanel, EnableCredentialsPanel, ResetPasswordPanel, ChangePasswordForm, PasswordNotice } from "@/modules/account-administration/forms";
import type { SafeAccountRowView } from "@/modules/account-administration/presentation";

vi.mock("@/db/client", () => { throw new Error("Database import forbidden in account component tests."); });
afterEach(() => cleanup());

const passthrough = (async () => ({})) as unknown as Parameters<typeof CreateAccountPanel>[0]["action"];

const row: SafeAccountRowView = {
  userId: "u1", displayName: "Fictional Person", employeeCode: "0007", username: "fictional", loginEmail: "fictional@example.test",
  role: "ADMIN", active: true, credentialStatus: "Configured", passwordChangedAt: "3 Feb 2026, 08:05", lockStatus: "Not locked",
  mustChangePassword: true, createdAt: "2 Jan 2026, 07:04", credentialVersion: 3,
};

function renderTable(rows: SafeAccountRowView[] = [row]) {
  return render(
    <AccountTable
      rows={rows}
      summary={{ total: rows.length, active: rows.length, inactive: 0, configured: rows.length, missing: 0 }}
      asOf="2 Jan 2026, 07:04"
      asOfLabel="Asia/Dubai"
      page={1}
      pageSize={25}
      total={rows.length}
      candidates={[{ userId: "u2", displayName: "No Login", employeeCode: "0008" }]}
      actingUserId="u9" createAction={passthrough} enableAction={passthrough} resetAction={passthrough}
    />,
  );
}

describe("account administration table", () => {
  it("renders safe account columns and a password notice without any hash", () => {
    renderTable();
    expect(screen.getByRole("region", { name: "Account summary" })).toBeVisible();
    expect(screen.getByText("Fictional Person")).toBeVisible();
    expect(screen.getByText("0007")).toBeVisible();
    expect(screen.getByText("fictional@example.test")).toBeVisible();
    expect(screen.getByText("Configured")).toBeVisible();
    expect(screen.getByText("Not locked")).toBeVisible();
    expect(screen.getByText(/cannot be viewed/i)).toBeVisible();
    expect(document.body.textContent).not.toMatch(/scrypt\$|password_hash|passwordHash|salt|pepper/i);
  });

  it("shows an explicit empty state when no accounts match", () => {
    renderTable([]);
    expect(screen.getByText("No accounts match the current filters.")).toBeVisible();
  });

  it("renders the create form and enables the Super Admin confirmation control", () => {
    render(<CreateAccountPanel action={passthrough} />);
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByLabelText(/Display name/)).toBeVisible();
    expect(screen.getByLabelText(/Username/)).toBeVisible();
    expect(screen.getByLabelText(/Login email/)).toBeVisible();
    expect(screen.getByLabelText(/Initial system role/)).toBeVisible();
    expect(screen.getByLabelText(/Temporary password/)).toBeVisible();
    expect(screen.getByLabelText(/Confirm temporary password/)).toBeVisible();
    expect(screen.getByLabelText(/Require password change at next login/)).toBeChecked();
    fireEvent.change(screen.getByLabelText(/Initial system role/), { target: { value: "SUPER_ADMIN" } });
    expect(screen.getByText(/I confirm creating another Super Admin/)).toBeVisible();
  });

  it("renders the enable-sign-in form for a record without credentials", () => {
    render(<EnableCredentialsPanel action={passthrough} candidates={[{ userId: "u2", displayName: "No Login", employeeCode: "0008" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Enable sign-in for existing record" }));
    expect(screen.getByLabelText(/Workforce record/)).toBeVisible();
    expect(screen.getByRole("option", { name: /No Login/ })).toBeInTheDocument();
  });

  it("shows an empty enable state when every record already has credentials", () => {
    render(<EnableCredentialsPanel action={passthrough} candidates={[]} />);
    expect(screen.getByText("Every workforce record already has sign-in credentials.")).toBeVisible();
  });

  it("renders the reset form with revoke confirmation and never echoes a password", () => {
    render(<ResetPasswordPanel action={passthrough} row={{ userId: "u1", displayName: "Fictional Person", credentialVersion: 3 }} needsCurrentPassword anotherSuperAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    expect(screen.getByLabelText(/New temporary password/)).toBeVisible();
    expect(screen.getByLabelText(/I understand all existing sessions/)).toBeVisible();
    expect(screen.getByLabelText(/Your current password/)).toBeVisible();
    expect(screen.getByLabelText(/I confirm resetting another Super Admin/)).toBeVisible();
    expect(document.body.textContent).not.toMatch(/scrypt\$|password_hash/i);
  });

  it("renders an accessible, keyboard-submittable self-change form", () => {
    render(<ChangePasswordForm action={passthrough} required />);
    expect(screen.getByRole("status")).toHaveTextContent(/temporary password/i);
    const submit = screen.getByRole("button", { name: "Change password" });
    expect(submit).toHaveAttribute("type", "submit");
    expect(screen.getByLabelText(/Current password/)).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByLabelText(/New password/)).toHaveAttribute("autocomplete", "new-password");
    fireEvent.submit(submit.closest("form")!);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });

  it("states that passwords cannot be viewed", () => {
    render(<PasswordNotice />);
    expect(screen.getByRole("note")).toHaveTextContent("Passwords cannot be viewed");
  });

  it("has no database dependency in the account UI modules", () => {
    for (const file of ["src/modules/account-administration/forms.tsx", "src/modules/account-administration/table.tsx"]) {
      expect(readFileSync(file, "utf8")).not.toContain("@/db/client");
    }
  });
});
