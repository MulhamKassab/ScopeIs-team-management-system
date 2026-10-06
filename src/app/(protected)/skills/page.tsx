import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentActor } from "@/modules/auth/session-service";
import { capabilityService } from "@/modules/capabilities/service";
import { EmployeeSkillManager, SkillCatalogue } from "@/modules/capabilities/forms";
import { employeeProfileService, employeeSkillService } from "@/modules/employees/employee-services";
import { EmployeeDomainError } from "@/modules/employees/domain-error";

export const dynamic = "force-dynamic";
export default async function SkillsPage({ searchParams }: { searchParams: Promise<{ skill?: string; employee?: string }> }) {
  const actor = await getCurrentActor(); if (!actor) redirect("/login"); const params = await searchParams;
  if (actor.role === "EMPLOYEE") {
    let records;
    try { records = await employeeSkillService.listForEmployee(actor, actor.id); }
    catch (error) {
      if (error instanceof EmployeeDomainError && error.code === "NOT_FOUND") {
        return <section className="operations-page"><header className="operations-heading"><h2>My recorded skills</h2></header><section className="operation-panel"><h3>Profile setup required</h3><p>Ask your Super Admin to complete your workforce profile before recording your skills.</p><Link className="button" href="/profile">Open My Profile</Link></section></section>;
      }
      throw error;
    }
    return <section className="operations-page"><header className="operations-heading"><div><p className="eyebrow">Employee self-service</p><h2>My recorded skills</h2><p>These are management-recorded skill facts. You cannot add free-text skills or change qualification records.</p></div></header><section className="operation-panel"><h3>Recorded skills</h3>{records.length ? <ul className="operation-list">{records.map(({ association, skill }) => <li key={association.id}><div><strong>{skill.name}</strong><span>Recorded skill</span></div></li>)}</ul> : <p className="operation-empty">No skills have been recorded on your profile.</p>}</section></section>;
  }
  const planner = await capabilityService.plannerCandidates(actor, { skillId: params.skill || undefined });
  if (actor.role === "ADMIN") return <section className="operations-page"><header className="operations-heading"><div><p className="eyebrow">Team skills</p><h2>Find a skill in your team</h2><p>Choose a recorded skill to find employees within your team access.</p></div></header><form className="operation-form compact" method="get"><label>Recorded skill<select name="skill" defaultValue={params.skill ?? ""}><option value="">Choose an active skill</option>{planner.skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label><button className="button primary">Filter Employees</button></form><section className="operation-panel"><h3>{planner.selectedSkill ? `Employees with ${planner.selectedSkill.name}` : "Choose a skill"}</h3>{planner.selectedSkill ? planner.candidates.length ? <ul className="operation-list">{planner.candidates.map((candidate) => <li key={candidate.id}><div><strong>{candidate.displayName}</strong><span>Recorded skill</span></div></li>)}</ul> : <p className="operation-empty">No employee within your team access has this recorded skill.</p> : <p className="operation-empty">Select a skill above to see matching employees.</p>}</section></section>;
  const [catalogue, activePlanner, directory] = await Promise.all([capabilityService.catalogue(actor), capabilityService.plannerCandidates(actor, {}), employeeProfileService.listDirectoryProfiles(actor, { active: true })]); const selectedEmployeeId = params.employee && directory.items.some((profile) => profile.userId === params.employee) ? params.employee : undefined; const records = selectedEmployeeId ? await employeeSkillService.listForEmployee(actor, selectedEmployeeId) : [];
  return <section className="operations-page"><header className="operations-heading"><div><p className="eyebrow">People</p><h2>Team skills</h2><p>Maintain the skill catalogue and record the skills held by your team.</p></div></header><section className="operation-panel"><h3>Review an Employee</h3><form className="operation-form compact" method="get"><label>Employee<select name="employee" defaultValue={selectedEmployeeId ?? ""}><option value="">Choose Employee</option>{directory.items.map((profile) => <option key={profile.userId} value={profile.userId}>{profile.user.displayName}</option>)}</select></label><button className="button">Review recorded skills</button></form></section><div className="operation-columns"><SkillCatalogue skills={catalogue} /><EmployeeSkillManager employees={directory.items.map((profile) => ({ id: profile.userId, displayName: profile.user.displayName }))} skills={activePlanner.skills} selectedEmployeeId={selectedEmployeeId} records={records} /></div></section>;
}
