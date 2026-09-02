"use client";

import { IconArrowRight, IconCheck, IconShieldLock } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/shared/components/brand";

const personas = [
  ["mock-super-admin-nora", "Nora Albright", "Super Admin", "Global workforce management", "NA"],
  ["mock-admin-ava", "Ava Mercer", "Admin", "Team Alpha · read-only directory", "AM"],
  ["mock-admin-ben", "Ben Iqbal", "Admin", "Team Bravo · read-only directory", "BI"],
  ["mock-employee-cora", "Cora Bell", "Employee", "Own professional profile", "CB"],
  ["mock-employee-dan", "Dan Rowan", "Employee", "Own professional profile", "DR"],
] as const;

export function LoginScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(personas[0][0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/mock-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId: selected }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.message ?? "Unable to start a mock session.");
      setPending(false);
      return;
    }
    router.push(payload.redirectTo);
    router.refresh();
  }

  return <main className="login-page">
    <section className="login-card" aria-labelledby="login-title">
      <header className="login-heading">
        <Brand />
        <span className="preview-pill">Frontend preview</span>
        <p className="eyebrow">Temporary mock-data environment</p>
        <h1 id="login-title">Welcome to ScopeIs</h1>
        <p className="intro">Choose a fictional persona to review the redesigned application with its real server-side role boundaries.</p>
      </header>

      <div className="mock-callout">
        <IconShieldLock aria-hidden="true" />
        <span><strong>Safe preview sign-in</strong><small>No passwords or real employee data are used. This is temporary mock authentication.</small></span>
      </div>

      <fieldset>
        <legend>Choose a fictional persona</legend>
        <div className="persona-list">
          {personas.map(([id, name, role, scope, avatar]) => <label key={id} className={`persona-option ${selected === id ? "selected" : ""}`}>
            <input type="radio" name="persona" value={id} checked={selected === id} onChange={() => setSelected(id)} />
            <span className="persona-option-avatar" aria-hidden="true">{avatar}</span>
            <span className="persona-option-copy"><strong>{name}</strong><small>{role}</small><small>{scope}</small></span>
            <IconCheck className="persona-check" aria-hidden="true" />
          </label>)}
        </div>
      </fieldset>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button primary login-submit" type="button" disabled={pending} onClick={signIn}>
        <span>{pending ? "Starting session…" : "Continue with mock persona"}</span>
        {!pending ? <IconArrowRight aria-hidden="true" /> : null}
      </button>
      <p className="login-footnote">Phase 1–2 functionality · Disposable local test environment</p>
    </section>
  </main>;
}
