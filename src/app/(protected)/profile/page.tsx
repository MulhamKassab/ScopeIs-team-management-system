import { IconInfoCircle, IconUser } from "@tabler/icons-react";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { SelfProfileForm } from "@/modules/employees/self-profile-form";
import { employeeProfileService } from "@/modules/employees/employee-services";

export const dynamic = "force-dynamic";
function initials(name: string) { return name.split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase(); }

export default async function ProfilePage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  const profile = await employeeProfileService.getOwnProfile(actor);
  return <section className="employee-self-profile" aria-labelledby="profile-title">
    <header className="employee-profile-header">
      <span className="profile-avatar" aria-hidden="true">{initials(profile.user.displayName)}</span>
      <div><p className="eyebrow">Phase 2 · My profile</p><h1 id="profile-title">My professional profile</h1><p>Keep your allowed work contact details up to date.</p></div>
      <span className="status-pill working"><IconUser aria-hidden="true" />Self service</span>
    </header>
    <div className="profile-layout">
      <aside className="profile-summary-card" aria-label="Employee identity"><p className="eyebrow">Employee identity</p><dl><div><dt>Name</dt><dd>{profile.user.displayName}</dd></div><div><dt>Employee code</dt><dd>{profile.employeeCode}</dd></div></dl><p className="privacy-note"><IconInfoCircle aria-hidden="true" />Your role, assignments, and employment identity are read-only here.</p></aside>
      <div className="profile-edit-card"><div className="panel-heading"><div><p className="eyebrow">Editable information</p><h2>Professional details</h2></div></div><p className="directory-intro">Only your work email, work phone, and professional summary can be changed.</p><SelfProfileForm profile={profile} /></div>
    </div>
  </section>;
}
