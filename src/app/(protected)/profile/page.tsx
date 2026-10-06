import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentActor } from "@/modules/auth/session-service";
import { SelfProfileForm } from "@/modules/employees/self-profile-form";
import { CapabilityEvidencePanel } from "@/modules/evidence/forms";
import { evidenceRepository } from "@/modules/evidence/repositories";
import { evidenceService } from "@/modules/evidence/service";
import { db } from "@/db/client";
import { employeeProfileService } from "@/modules/employees/employee-services";
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
  const [evidence, skills] = await Promise.all([evidenceService.listMine(actor), evidenceRepository.activeSkillOptions(db)]);
  const activeEvidence = evidence.items.filter((item) => !item.archivedAt);
  return <div className="people-profile-page">
    <section className="employee-self-profile" aria-labelledby="profile-title">
      <header className="people-page-heading"><div><p className="eyebrow">My workspace</p><h2 id="profile-title">My professional profile</h2><p className="directory-intro">Your work details, experience, and supporting documents.</p></div><SelfProfileForm profile={profile} /></header>
      <div className="people-profile-card"><div className="people-avatar" aria-hidden="true">{profile.user.displayName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div className="people-profile-identity"><h3>{profile.user.displayName}</h3><p>Employee {profile.employeeCode} · {profile.team ? profile.team.replace(/^team:/, "") : "Team not assigned"}</p><p>{profile.professionalSummary || "Add a short professional summary to introduce your experience."}</p></div></div>
      <dl className="people-profile-facts"><div><dt>Work email</dt><dd>{profile.workEmail || "Not recorded"}</dd></div><div><dt>Work phone</dt><dd>{profile.workPhone || "Not recorded"}</dd></div><div><dt>Certifications</dt><dd>{activeEvidence.filter((item) => item.kind === "certification").length} recorded</dd></div><div><dt>CV</dt><dd>{activeEvidence.some((item) => item.kind === "cv" && item.files.some((file) => !file.archivedAt)) ? "Uploaded" : "No file uploaded"}</dd></div></dl>
      <Link className="people-security-link" href="/account/change-password">Change your password</Link>
    </section>
    <CapabilityEvidencePanel items={evidence.items} skills={skills} />
  </div>;
}
