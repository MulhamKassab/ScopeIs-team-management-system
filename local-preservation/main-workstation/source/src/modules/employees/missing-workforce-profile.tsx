import Link from "next/link";
import type { AuthenticatedActor } from "@/shared/types/foundation";
import type { AccountFormAction } from "@/modules/account-administration/actions";
import { CompleteWorkforceProfileForm } from "@/modules/account-administration/forms";

export function MissingWorkforceProfile({ actor, completeAction }: {
  actor: Pick<AuthenticatedActor, "id" | "displayName" | "role">; completeAction: AccountFormAction;
}) {
  return <section className="employee-self-profile" aria-labelledby="profile-title">
    <header className="people-page-heading"><div><p className="eyebrow">My workspace</p><h2 id="profile-title">My professional profile</h2></div></header>
    <div className="people-profile-card"><div className="people-profile-identity"><h3>{actor.displayName}</h3>
      <p>Your sign-in account is ready. Your workforce profile has not been set up yet.</p>
      {actor.role === "SUPER_ADMIN" ? <><p>Complete your profile to add your work details, experience, and supporting documents.</p>
        <CompleteWorkforceProfileForm action={completeAction} userId={actor.id} displayName={actor.displayName} />
        <Link className="button" href="/accounts">Manage team accounts</Link></>
        : <p>Ask your Super Admin to complete your workforce profile in Account administration.</p>}
    </div></div>
    <Link className="people-security-link" href="/account/change-password">Change your password</Link>
  </section>;
}
