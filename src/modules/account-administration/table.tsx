import Link from "next/link";
import type { SafeAccountRowView } from "./presentation";
import { CompleteWorkforceProfileForm, CreateAccountPanel, EnableCredentialsPanel, ResetPasswordPanel } from "./forms";
import type { AccountFormAction } from "./actions";
import { buildAccountPageHref, type AccountPageFilters } from "./query";

export type AccountTableProps = {
  rows: SafeAccountRowView[];
  summary: { total: number; active: number; inactive: number; configured: number; missing: number };
  asOf: string;
  filters?: AccountPageFilters;
  page: number;
  pageSize: number;
  total: number;
  candidates: { userId: string; displayName: string; employeeCode: string | null }[];
  actingUserId: string;
  createAction: AccountFormAction;
  enableAction: AccountFormAction;
  resetAction: AccountFormAction;
  completeProfileAction: AccountFormAction;
};

/**
 * The account table is a server component. It renders only safe projection fields, so a hash, salt,
 * pepper, token, cookie, or raw audit metadata never reaches the DOM.
 */
export function AccountTable(props: AccountTableProps) {
  const { rows, summary, asOf, filters, page, pageSize, total } = props;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="account-admin">
      <section className="account-summary" aria-label="Account summary">
        <dl>
          <div><dt>Total accounts</dt><dd>{summary.total}</dd></div>
          <div><dt>Active</dt><dd>{summary.active}</dd></div>
          <div><dt>Inactive</dt><dd>{summary.inactive}</dd></div>
          <div><dt>Login configured</dt><dd>{summary.configured}</dd></div>
          <div><dt>Login missing</dt><dd>{summary.missing}</dd></div>
        </dl>
        <p className="account-asof">As of {asOf}</p>
      </section>

      <div className="account-list-toolbar"><div><h3>Team accounts</h3><p>{total} {total === 1 ? "account" : "accounts"} {filters && [filters.query, filters.role, filters.status, filters.credentials].some(Boolean) ? "matching your filters" : "in your team"}</p></div><div className="account-actions-row">
        <CreateAccountPanel action={props.createAction} />
        <EnableCredentialsPanel action={props.enableAction} candidates={props.candidates} />
      </div></div>
      <p className="account-password-notice" role="note">Passwords cannot be viewed. Set a temporary password if the user needs new credentials.</p>

      {rows.length === 0 ? (
        <p className="account-empty" role="status">No accounts match the current filters.</p>
      ) : (
        <div className="account-table-scroll">
          <table className="account-table" role="table">
            <caption className="sr-only">Application accounts and safe credential status</caption>
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col">Team member</th>
                <th scope="col">Sign-in identity</th>
                <th scope="col">System role</th>
                <th scope="col">Status</th>
                <th scope="col">Sign-in access</th>
                <th scope="col">Credential history</th>
                <th scope="col">Management</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {rows.map((row) => <AccountRow key={row.userId} row={row} actingUserId={props.actingUserId} resetAction={props.resetAction} completeProfileAction={props.completeProfileAction} />)}
            </tbody>
          </table>
        </div>
      )}

      <nav className="account-pagination" aria-label="Account pages">
        <span>Page {page} of {pageCount}</span>
        {page > 1 ? <Link className="button" href={buildAccountPageHref(page - 1, filters)}>Previous</Link> : null}
        {page < pageCount ? <Link className="button" href={buildAccountPageHref(page + 1, filters)}>Next</Link> : null}
      </nav>
    </div>
  );
}

function AccountRow({ row, actingUserId, resetAction, completeProfileAction }: { row: SafeAccountRowView; actingUserId: string; resetAction: AccountFormAction; completeProfileAction: AccountFormAction }) {
  const self = row.userId === actingUserId;
  const anotherSuperAdmin = !self && row.role === "SUPER_ADMIN";
  return (
    <tr role="row">
      <th scope="row" role="rowheader"><span className="account-cell-stack"><strong>{row.displayName}</strong><small>{row.hasWorkforceProfile ? row.employeeCode : "Workforce profile missing"}</small></span></th>
      <td role="cell" data-label="Sign-in identity"><span className="account-cell-stack"><span>{row.username}</span><small>{row.loginEmail}</small></span></td>
      <td role="cell" data-label="System role">{row.role === "SUPER_ADMIN" ? "Super Admin" : row.role === "ADMIN" ? "Admin" : "Employee"}</td>
      <td role="cell" data-label="Status"><span className={`directory-status ${row.active ? "active" : "inactive"}`}>{row.active ? "Active" : "Inactive"}</span></td>
      <td role="cell" data-label="Sign-in access"><span className="account-cell-stack"><span>{row.credentialStatus}</span><small>{row.mustChangePassword ? "Password change required" : "No password change required"}</small><small>{row.lockStatus}</small></span></td>
      <td role="cell" data-label="Credential history"><span className="account-cell-stack"><span>{row.credentialStatus === "Configured" ? row.passwordChangedAt : "Not available"}</span><small>Created {row.createdAt}</small></span></td>
      <td role="cell" data-label="Management">
        <div className="account-row-actions">
          {!row.hasWorkforceProfile && row.active ? <CompleteWorkforceProfileForm action={completeProfileAction} userId={row.userId} displayName={row.displayName} /> : null}
          {row.credentialStatus === "Configured"
            ? <ResetPasswordPanel action={resetAction} row={{ userId: row.userId, displayName: row.displayName, credentialVersion: row.credentialVersion }} needsCurrentPassword={self || anotherSuperAdmin} anotherSuperAdmin={anotherSuperAdmin} />
            : <span className="account-help">Enable sign-in above for records without credentials.</span>}
        </div>
      </td>
    </tr>
  );
}
