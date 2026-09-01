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

export function EmployeeDirectory({ profiles }: { profiles: DirectoryProfile[] }) {
  return (
    <section className="employee-directory" aria-labelledby="employee-directory-title">
      <p className="eyebrow">Phase 2 · Workforce</p>
      <h2 id="employee-directory-title">Employee directory</h2>
      <p className="directory-intro">Authorized workforce records in your current management scope.</p>

      {profiles.length === 0 ? (
        <div className="directory-empty" role="status">
          <h3>No employee records are available</h3>
          <p>There are no employee profiles in your authorized directory scope.</p>
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
