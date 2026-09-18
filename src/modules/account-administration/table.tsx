import Link from "next/link";
import type { SafeAccountRowView } from "./presentation";
import { CreateAccountPanel, EnableCredentialsPanel, ResetPasswordPanel } from "./forms";
import type { AccountFormAction } from "./actions";

export type AccountTableProps = {
  rows: SafeAccountRowView[];
  summary: { total: number; active: number; inactive: number; configured: number; missing: number };
  asOf: string;
  asOfLabel: string;
  page: number;
  pageSize: number;
  total: number;
  candidates: { userId: string; displayName: string; employeeCode: string | null }[];
  actingUserId: string;
  createAction: AccountFormAction;
  enableAction: AccountFormAction;
  resetAction: AccountFormAction;
};

function buildPageHref(page: number) {
  return page <= 1 ? "/accounts" : `/accounts?page=${page}`;
}

/**
 * The account table is a server component. It renders only safe projection fields, so a hash, salt,
 * pepper, token, cookie, or raw audit metadata never reaches the DOM.
 */
export function AccountTable(props: AccountTableProps) {
  const { rows, summary, asOf, asOfLabel, page, pageSize, total } = props;
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
        <p className="account-asof">As of {asOf} ({asOfLabel})</p>
      </section>

      <div className="account-actions-row">
        <CreateAccountPanel action={props.createAction} />
        <EnableCredentialsPanel action={props.enableAction} candidates={props.candidates} />
      </div>
      <p className="account-password-notice" role="note">Passwords cannot be viewed. Set a temporary password if the user needs new credentials.</p>

      {rows.length === 0 ? (
        <p className="account-empty" role="status">No accounts match the current filters.</p>
      ) : (
        <div className="account-table-scroll">
          <table className="account-table">
            <caption className="sr-only">Application accounts and safe credential status</caption>
            <thead>
              <tr>
                <th scope="col">Display name</th>
                <th scope="col">Employee code</th>
                <th scope="col">Username</th>
                <th scope="col">Login email</th>
                <th scope="col">System role</th>
                <th scope="col">Status</th>
                <th scope="col">Credential</th>
                <th scope="col">Password changed</th>
                <th scope="col">Sign-in lock</th>
                <th scope="col">Requires change</th>
                <th scope="col">Created</th>
                <th scope="col">Management</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => <AccountRow key={row.userId} row={row} actingUserId={props.actingUserId} resetAction={props.resetAction} />)}
            </tbody>
          </table>
        </div>
      )}

      <nav className="account-pagination" aria-label="Account pages">
        <span>Page {page} of {pageCount}</span>
        {page > 1 ? <Link className="button" href={buildPageHref(page - 1)}>Previous</Link> : null}
        {page < pageCount ? <Link className="button" href={buildPageHref(page + 1)}>Next</Link> : null}
      </nav>
    </div>
  );
}

function AccountRow({ row, actingUserId, resetAction }: { row: SafeAccountRowView; actingUserId: string; resetAction: AccountFormAction }) {
  const self = row.userId === actingUserId;
  const anotherSuperAdmin = !self && row.role === "SUPER_ADMIN" && row.active;
  return (
    <tr>
      <th scope="row">{row.displayName}</th>
      <td>{row.employeeCode}</td>
      <td>{row.username}</td>
      <td>{row.loginEmail}</td>
      <td>{row.role.replace("_", " ")}</td>
      <td>{row.active ? "Active" : "Inactive"}</td>
      <td>{row.credentialStatus}</td>
      <td>{row.credentialStatus === "Configured" ? row.passwordChangedAt : "Not available"}</td>
      <td>{row.lockStatus}</td>
      <td>{row.mustChangePassword ? "Yes" : "No"}</td>
      <td>{row.createdAt}</td>
      <td>
        <div className="account-row-actions">
          {row.credentialStatus === "Configured"
            ? <ResetPasswordPanel action={resetAction} row={{ userId: row.userId, displayName: row.displayName, credentialVersion: row.credentialVersion }} needsCurrentPassword={self || anotherSuperAdmin} anotherSuperAdmin={anotherSuperAdmin} />
            : <span className="account-help">Enable sign-in above for records without credentials.</span>}
        </div>
      </td>
    </tr>
  );
}
