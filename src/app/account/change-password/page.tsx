import { redirect } from "next/navigation";
import { getCurrentActor, mustChangePassword } from "@/modules/auth/session-service";
import { ChangePasswordForm } from "@/modules/account-administration/forms";
import { changeOwnPasswordAction } from "@/modules/account-administration/actions";
import { Brand } from "@/shared/components/brand";

export const dynamic = "force-dynamic";

/**
 * Self-only password change. It lives outside the `(protected)` group so a user holding only a
 * temporary password can reach it; it still requires an authenticated session. A Super Admin cannot
 * use it to view or change another user's password because the subject is always the session actor.
 */
export default async function ChangePasswordPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  const required = await mustChangePassword(actor.id);
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="change-password-title">
        <Brand />
        <h1 id="change-password-title">Change your password</h1>
        {required
          ? <p className="account-help">You must set a new password before you can continue.</p>
          : <p className="account-help">Set a new password for your own account. Passwords cannot be viewed or recovered.</p>}
        <ChangePasswordForm action={changeOwnPasswordAction} required={required} />
      </section>
    </main>
  );
}
