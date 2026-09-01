import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { SelfProfileForm } from "@/modules/employees/self-profile-form";
import { employeeProfileService } from "@/modules/employees/employee-services";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  const profile = await employeeProfileService.getOwnProfile(actor);
  return <section className="employee-self-profile" aria-labelledby="profile-title"><p className="eyebrow">Phase 2 · My profile</p><h2 id="profile-title">My professional profile</h2><p className="directory-intro">Only your work email, work phone, and professional summary can be changed here.</p><dl><div><dt>Name</dt><dd>{profile.user.displayName}</dd></div><div><dt>Employee code</dt><dd>{profile.employeeCode}</dd></div></dl><SelfProfileForm profile={profile} /></section>;
}
