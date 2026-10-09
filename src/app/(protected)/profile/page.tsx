import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentActor } from "@/modules/auth/session-service";
import { listTeamOptions } from "@/modules/employees/team-options";
import { SelfProfileForm } from "@/modules/employees/self-profile-form";
import { CapabilityEvidencePanel } from "@/modules/evidence/forms";
import { evidenceRepository } from "@/modules/evidence/repositories";
import { evidenceService } from "@/modules/evidence/service";
import { db } from "@/db/client";
import { employeeProfileService, employeeSkillService } from "@/modules/employees/employee-services";
import { EmployeeDomainError } from "@/modules/employees/domain-error";
import { MissingWorkforceProfile } from "@/modules/employees/missing-workforce-profile";
import { completeWorkforceProfileAction } from "@/modules/account-administration/actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  let profile;
  try {
    profile = await employeeProfileService.getOwnProfile(actor);
  } catch (error) {
    if (error instanceof EmployeeDomainError && error.code === "NOT_FOUND") {
      return <MissingWorkforceProfile actor={actor} completeAction={completeWorkforceProfileAction} />;
    }
    throw error;
  }
  const [evidence, skills, teams, recordedSkills] = await Promise.all([evidenceService.listMine(actor), evidenceRepository.activeSkillOptions(db), listTeamOptions(), employeeSkillService.listForEmployee(actor, actor.id)]);
  const teamName = teams.find((team) => team.id === profile.team)?.name;
  const activeEvidence = evidence.items.filter((item) => !item.archivedAt);
  return <div className="people-profile-page">
    <section className="employee-self-profile" aria-labelledby="profile-title">
      <header className="people-page-heading"><div><p className="eyebrow">My workspace</p><h2 id="profile-title">My professional profile</h2><p className="directory-intro">Your work details, experience, and supporting documents.</p></div><SelfProfileForm profile={profile} /></header>
      <div className="people-profile-card"><div className="people-avatar" aria-hidden="true">{profile.user.displayName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div className="people-profile-identity"><h3>{profile.user.displayName}</h3><p>Employee {profile.employeeCode} · {profile.team ? teamName ?? profile.team.replace(/^team:/, "") : "Team not assigned"}</p><p>{profile.professionalSummary || "Add a short professional summary to introduce your experience."}</p></div></div>
      <dl className="people-profile-facts"><div><dt>Work email</dt><dd>{profile.workEmail || "Not recorded"}</dd></div><div><dt>Work phone</dt><dd>{profile.workPhone || "Not recorded"}</dd></div><div><dt>Certifications</dt><dd>{activeEvidence.filter((item) => item.kind === "certification").length} recorded</dd></div><div><dt>CV</dt><dd>{activeEvidence.some((item) => item.kind === "cv" && item.files.some((file) => !file.archivedAt)) ? "Uploaded" : "No file uploaded"}</dd></div></dl>
      <Link className="people-security-link" href="/account/change-password">Change your password</Link>
    </section>
    <section className="operation-panel" aria-labelledby="profile-skills-title"><h3 id="profile-skills-title">My recorded skills</h3><p>These skills are recorded by your Super Admin. Contact them if a record needs correcting.</p>{recordedSkills.length ? <ul className="operation-list">{recordedSkills.map(({ association, skill }) => <li key={association.id}><div><strong>{skill.name}</strong><span>Recorded skill</span></div></li>)}</ul> : <p className="operation-empty">No skills have been recorded on your profile.</p>}</section>
    <CapabilityEvidencePanel items={evidence.items} skills={skills} />
  </div>;
}
