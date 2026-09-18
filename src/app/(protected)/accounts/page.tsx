import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { can } from "@/modules/authorization/authorization-service";
import { AccountTable } from "@/modules/account-administration/table";
import { accountAdministrationService } from "@/modules/account-administration/service";
import { parseAccountSearchParams, type AccountSearchParams } from "@/modules/account-administration/query";
import { ACCOUNT_TIMEZONE } from "@/modules/account-administration/presentation";
import { createAccountAction, enableCredentialsAction, resetPasswordAction } from "@/modules/account-administration/actions";

export const dynamic = "force-dynamic";

export default async function AccountsPage({ searchParams }: { searchParams: Promise<AccountSearchParams> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  // Independent page-level enforcement: Admin, Employee, and stale actors receive a non-enumerating 404.
  if (!can(actor, "module:accounts:view") || actor.role !== "SUPER_ADMIN") notFound();

  const parsed = parseAccountSearchParams(await searchParams);
  const [page, summary, candidates] = await Promise.all([
    accountAdministrationService.list(actor, parsed.filter),
    accountAdministrationService.summary(actor),
    accountAdministrationService.accountsWithoutCredentials(actor),
  ]);

  return (
    <section className="account-page" aria-labelledby="accounts-title">
      <header className="account-page-header">
        <div><p className="eyebrow">Super Admin only</p><h2 id="accounts-title">Account administration</h2><p>Create accounts, enable sign-in for existing workforce records, and reset passwords. Passwords are one-way hashes and are never shown or recovered.</p></div>
      </header>

      <form className="account-filters" method="get" role="search">
        <label htmlFor="account-filter-query">Search</label>
        <input id="account-filter-query" name="query" type="search" defaultValue={parsed.raw.query ?? ""} maxLength={80} placeholder="Name, username, email, or code" />
        <label htmlFor="account-filter-role">Role</label>
        <select id="account-filter-role" name="role" defaultValue={parsed.raw.role ?? ""}>
          <option value="">Any role</option>
          <option value="EMPLOYEE">Employee</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
        <label htmlFor="account-filter-status">Status</label>
        <select id="account-filter-status" name="status" defaultValue={parsed.raw.status ?? ""}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <label htmlFor="account-filter-credentials">Credentials</label>
        <select id="account-filter-credentials" name="credentials" defaultValue={parsed.raw.credentials ?? ""}>
          <option value="">Any</option>
          <option value="configured">Configured</option>
          <option value="missing">Not configured</option>
        </select>
        <button className="button primary" type="submit">Apply filters</button>
      </form>
      {!parsed.valid ? <p className="form-error" role="alert">Some filters were invalid and were ignored.</p> : null}

      <AccountTable
        rows={page.items}
        summary={summary}
        asOf={page.asOf}
        asOfLabel={ACCOUNT_TIMEZONE}
        page={page.page}
        pageSize={page.pageSize}
        total={page.total}
        candidates={candidates}
        actingUserId={actor.id}
        createAction={createAccountAction}
        enableAction={enableCredentialsAction}
        resetAction={resetPasswordAction}
      />
    </section>
  );
}
