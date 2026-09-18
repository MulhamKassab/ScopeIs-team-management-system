"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/shared/components/brand";

const invalidCredentialMessages = new Set(["INVALID_CREDENTIALS", "VALIDATION"]);
export function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setPending(true); setError(null);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, password }) });
      const payload = await response.json();
      if (!response.ok) {
        setError(invalidCredentialMessages.has(payload.error) ? "The username/email or password is incorrect."
          : response.status === 503 ? "Sign in is temporarily unavailable. Please contact your administrator." : "Unable to sign in. Please try again.");
        setPending(false);
        return;
      }
      router.push(payload.redirectTo); router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
      setPending(false);
    }
  }
  return <main className="login-page"><section className="login-card"><Brand /><h1>Sign in</h1>
    <form onSubmit={signIn}>
      <label htmlFor="login-identifier">Username or email</label>
      <input id="login-identifier" type="text" autoComplete="username" required value={identifier} onChange={(event) => setIdentifier(event.target.value)} disabled={pending} />
      <label htmlFor="login-password">Password</label>
      <div className="login-password-field">
        <input id="login-password" type={visible ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} />
        <button type="button" className="icon-button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Hide" : "Show"}</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary login-submit" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  </section></main>;
}
