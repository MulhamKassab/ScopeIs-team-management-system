import { IconArrowRight, IconFilter, IconSearch, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import type { EmployeeDirectoryFilterOptions, EmployeeDirectorySearchFilters } from "@/modules/employees/contracts";
import { EmployeeCreatePanel } from "@/modules/employees/employee-create-form";
import type { CreateEmployeeFormAction } from "@/modules/employees/employee-create-action";

export type DirectoryProfile = {
  userId: string;
  employeeCode: string;
  team: string | null;
  designationName?: string | null;
  user: { displayName: string; active: boolean };
};

function displayTeam(team: string | null) {
  if (!team) return "Unassigned";
  return team.replace(/^team:/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
}

export function EmployeeDirectory({ profiles, filters = {}, filterOptions = { teams: [], designations: [] }, invalidQuery = false, createEmployeeAction, canManage = false }: {
  profiles: DirectoryProfile[];
  filters?: EmployeeDirectorySearchFilters;
  filterOptions?: EmployeeDirectoryFilterOptions;
  invalidQuery?: boolean;
  createEmployeeAction?: CreateEmployeeFormAction;
  canManage?: boolean;
}) {
  const activeFilterCount = Object.values(filters).filter((value) => value !== undefined).length;
  const filtered = invalidQuery || activeFilterCount > 0;
  return (
    <section className="employee-directory" aria-labelledby="employee-directory-title">
      <header className="page-heading">
        <div><p className="eyebrow">Phase 2 · Workforce</p><h1 id="employee-directory-title">Employee directory</h1><p>Authorized workforce records in your current management scope.</p></div>
        {createEmployeeAction ? <EmployeeCreatePanel action={createEmployeeAction} /> : null}
      </header>

      <form className="directory-filters" action="/employees" method="get" aria-label="Employee directory search and filters">
        <div className="filter-heading"><IconFilter aria-hidden="true" /><strong>Filter directory</strong><span>{profiles.length} {profiles.length === 1 ? "record" : "records"}</span></div>
        <label className="search-field"><span>Search employees</span><span className="input-with-icon"><IconSearch aria-hidden="true" /><input name="query" type="search" defaultValue={filters.query} maxLength={80} placeholder="Name or employee code" /></span></label>
        <label><span>Designation</span><select name="designation" defaultValue={filters.designationId ?? ""}><option value="">All designations</option>{filterOptions.designations.map((designation) => <option key={designation.id} value={designation.id}>{designation.name}</option>)}</select></label>
        <label><span>Team</span><select name="team" defaultValue={filters.team ?? ""}><option value="">All available teams</option>{filterOptions.teams.map((team) => <option key={team} value={team}>{displayTeam(team)}</option>)}</select></label>
        <label><span>Status</span><select name="status" defaultValue={filters.status ?? ""}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <div className="directory-filter-actions"><button className="button primary" type="submit">Apply filters</button>{filtered ? <Link className="button secondary" href="/employees">Clear filters</Link> : null}</div>
      </form>
      {invalidQuery ? <p className="directory-filter-error" role="alert">Those search parameters could not be applied. Results were not shown.</p> : null}
      {activeFilterCount > 0 ? <p className="directory-filter-summary" role="status">{activeFilterCount} active {activeFilterCount === 1 ? "filter" : "filters"}</p> : null}

      {profiles.length === 0 ? (
        <div className="directory-empty" role="status">
          <span className="empty-state-icon"><IconUsers aria-hidden="true" /></span>
          <h3>{filtered ? "No matching employees" : "No employee records are available"}</h3>
          <p>{filtered ? "No employees match the current search and filters in your authorized scope." : "There are no employee profiles in your authorized directory scope."}</p>
        </div>
      ) : (
        <div className="directory-table-wrap" role="region" aria-label="Employee directory records" tabIndex={0}>
          <table>
            <thead>
              <tr><th scope="col">Employee</th><th scope="col">Employee code</th><th scope="col">Designation</th><th scope="col">Team</th><th scope="col">Status</th><th scope="col"><span className="visually-hidden">Action</span></th></tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.userId}>
                  <th scope="row"><Link className="employee-cell" href={`/employees/${profile.userId}`}><span className="employee-avatar" aria-hidden="true">{initials(profile.user.displayName)}</span><span><strong>{profile.user.displayName}</strong><small>{profile.designationName ?? "Designation not assigned"}</small></span></Link></th>
                  <td data-label="Employee code">{profile.employeeCode}</td>
                  <td data-label="Designation">{profile.designationName ?? "Unassigned"}</td>
                  <td data-label="Team">{displayTeam(profile.team)}</td>
                  <td data-label="Status"><span className={`directory-status ${profile.user.active ? "active" : "inactive"}`}>{profile.user.active ? "Active" : "Inactive"}</span></td>
                  <td data-label="Action"><Link className="record-action" href={`/employees/${profile.userId}`}>{canManage ? "Manage employee" : "View details"}<IconArrowRight aria-hidden="true" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
