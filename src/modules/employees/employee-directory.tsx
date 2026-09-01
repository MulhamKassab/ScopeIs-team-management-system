import Link from "next/link";
import type { EmployeeDirectoryFilterOptions, EmployeeDirectorySearchFilters } from "@/modules/employees/contracts";

export type DirectoryProfile = {
  userId: string;
  employeeCode: string;
  team: string | null;
  user: { displayName: string; active: boolean };
};

function displayTeam(team: string | null) {
  if (!team) return "Unassigned";
  return team.replace(/^team:/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function EmployeeDirectory({ profiles, filters = {}, filterOptions = { teams: [], designations: [] }, invalidQuery = false }: {
  profiles: DirectoryProfile[];
  filters?: EmployeeDirectorySearchFilters;
  filterOptions?: EmployeeDirectoryFilterOptions;
  invalidQuery?: boolean;
}) {
  const activeFilterCount = Object.values(filters).filter((value) => value !== undefined).length;
  const filtered = invalidQuery || activeFilterCount > 0;
  return (
    <section className="employee-directory" aria-labelledby="employee-directory-title">
      <p className="eyebrow">Phase 2 · Workforce</p>
      <h2 id="employee-directory-title">Employee directory</h2>
      <p className="directory-intro">Authorized workforce records in your current management scope.</p>

      <form className="directory-filters" action="/employees" method="get" aria-label="Employee directory search and filters">
        <label><span>Search employees</span><input name="query" type="search" defaultValue={filters.query} maxLength={80} placeholder="Name or employee code" /></label>
        <label><span>Designation</span><select name="designation" defaultValue={filters.designationId ?? ""}><option value="">All designations</option>{filterOptions.designations.map((designation) => <option key={designation.id} value={designation.id}>{designation.name}</option>)}</select></label>
        <label><span>Team</span><select name="team" defaultValue={filters.team ?? ""}><option value="">All available teams</option>{filterOptions.teams.map((team) => <option key={team} value={team}>{displayTeam(team)}</option>)}</select></label>
        <label><span>Status</span><select name="status" defaultValue={filters.status ?? ""}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <div className="directory-filter-actions"><button className="button primary" type="submit">Apply filters</button>{filtered ? <Link className="button directory-clear" href="/employees">Clear filters</Link> : null}</div>
      </form>
      {invalidQuery ? <p className="directory-filter-error" role="alert">Those search parameters could not be applied. Results were not shown.</p> : null}
      {activeFilterCount > 0 ? <p className="directory-filter-summary" role="status">{activeFilterCount} active {activeFilterCount === 1 ? "filter" : "filters"}</p> : null}

      {profiles.length === 0 ? (
        <div className="directory-empty" role="status">
          <h3>{filtered ? "No matching employees" : "No employee records are available"}</h3>
          <p>{filtered ? "No employees match the current search and filters in your authorized scope." : "There are no employee profiles in your authorized directory scope."}</p>
        </div>
      ) : (
        <div className="directory-table-wrap" role="region" aria-label="Employee directory records" tabIndex={0}>
          <table>
            <thead>
              <tr><th scope="col">Employee</th><th scope="col">Employee code</th><th scope="col">Team</th><th scope="col">Status</th></tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.userId}>
                  <th scope="row">{profile.user.displayName}</th>
                  <td data-label="Employee code">{profile.employeeCode}</td>
                  <td data-label="Team">{displayTeam(profile.team)}</td>
                  <td data-label="Status"><span className={`directory-status ${profile.user.active ? "active" : "inactive"}`}>{profile.user.active ? "Active" : "Inactive"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
