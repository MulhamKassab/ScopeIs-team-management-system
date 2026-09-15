"use client";

import { useActionState, useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  archiveEvidenceAction, createEvidenceAction, reviewEvidenceAction, updateEvidenceAction,
  type EvidenceAction, type EvidenceActionState,
} from "@/modules/evidence/actions";
import type { CertificationSummaryView, EvidenceItemView } from "@/modules/evidence/service";

const initial: EvidenceActionState = {};
type SkillOption = { id: string; name: string };

/** Stable per-intent key so a retried create submission is idempotent instead of duplicated. */
function newSubmissionKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `key-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const sections = [
  { kind: "certification", title: "Certifications", help: "Issuer, issue date, optional expiry date, and an optional private supporting file." },
  { kind: "portfolio", title: "Portfolio", help: "Private portfolio links (HTTPS only) and portfolio files." },
  { kind: "project_example", title: "Project examples", help: "A short project or delivery example. This is not a schedule or client record." },
  { kind: "cv", title: "CV", help: "One active CV. Uploading a replacement archives the previous CV so history is preserved." },
  { kind: "supporting_document", title: "Supporting documents", help: "Additional capability documents. They remain private to you and Super Admin." },
] as const;

function Feedback({ state }: { state: EvidenceActionState }) {
  return state.error ? <p className="operation-error" role="alert">{state.error}</p> : state.success ? <p className="operation-success" role="status">{state.success}</p> : null;
}

function Form({ action, title, children, submit }: { action: EvidenceAction; title: string; children: React.ReactNode; submit: string }) {
  const [state, formAction, pending] = useActionState(action, initial);
  return <form className="operation-form compact" action={formAction} aria-label={title}>{children}<Feedback state={state} /><button className="button primary" type="submit" disabled={pending}>{pending ? "Saving…" : submit}</button></form>;
}

/** Textual state badges: colour is never the only signal. */
function Badges({ item }: { item: EvidenceItemView }) {
  return <span className="evidence-badges">
    {item.isNewOrUpdated ? <span className="evidence-badge new">New / updated</span> : null}
    {item.reviewState === "reviewed" ? <span className="evidence-badge reviewed">Reviewed</span> : null}
    {item.reviewState === "verified" ? <span className="evidence-badge verified">Verified</span> : null}
    {item.reviewState === "unreviewed" ? <span className="evidence-badge">Not reviewed</span> : null}
    {item.expiryStatus === "expired" ? <span className="evidence-badge expired">Expired</span> : null}
    {item.expiryStatus === "no_expiry" ? <span className="evidence-badge">No expiry</span> : null}
    {item.archivedAt ? <span className="evidence-badge">Archived</span> : null}
  </span>;
}

function expiryText(item: EvidenceItemView) {
  if (!item.expiryDate) return "No expiry date recorded";
  return `Expires ${item.expiryDate} (${item.expiryStatus === "expired" ? "expired" : "valid"})`;
}

function EvidenceFields({ item, kind, skills }: { item?: EvidenceItemView; kind?: string; skills: SkillOption[] }) {
  const fieldId = useId();
  return <>
    {kind ? <input type="hidden" name="kind" value={kind} /> : null}
    <label>Title<input id={`${fieldId}-title`} name="title" defaultValue={item?.title ?? ""} maxLength={200} required /></label>
    {kind !== "project_example" && kind !== "cv" ? <label>Issuer or provider<input name="issuer" defaultValue={item?.issuer ?? ""} maxLength={120} /></label> : null}
    <div className="operation-form-grid">
      <label>Issue date<input name="issueDate" type="date" defaultValue={item?.issueDate ?? ""} /></label>
      <label>Expiry date (optional)<input name="expiryDate" type="date" defaultValue={item?.expiryDate ?? ""} /></label>
    </div>
    {kind === "portfolio" || kind === "project_example" ? <label>Portfolio link (HTTPS only)<input name="externalUrl" type="url" inputMode="url" placeholder="https://" defaultValue={item?.externalUrl ?? ""} maxLength={2048} /></label> : null}
    <label>Details<textarea name="details" defaultValue={item?.details ?? ""} maxLength={1000} rows={2} /></label>
    {kind === "certification" || kind === "supporting_document" ? <label>Related recorded skill<select name="relatedSkillId" defaultValue={item?.relatedSkillId ?? ""}><option value="">None</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label> : null}
  </>;
}

/** Uploads private bytes through the authorized route; storage keys never reach the browser. */
function FileUploader({ evidenceId, version, replaceFileId, label }: { evidenceId: string; version: number; replaceFileId?: string; label: string }) {
  const router = useRouter();
  const [state, setState] = useState<{ kind: "idle" | "busy" | "ok" | "error"; message?: string }>({ kind: "idle" });
  const fileFieldId = useId();

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) { setState({ kind: "error", message: "Choose a file first." }); return; }
    form.set("expectedVersion", String(version));
    if (replaceFileId) form.set("replaceFileId", replaceFileId);
    setState({ kind: "busy" });
    try {
      const response = await fetch(`/api/evidence/${evidenceId}/files`, { method: "POST", body: form });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setState({ kind: "error", message: typeof body.message === "string" ? body.message : "The file could not be uploaded." });
        return;
      }
      setState({ kind: "ok", message: "Private file saved." });
      router.refresh();
    } catch { setState({ kind: "error", message: "The file could not be uploaded." }); }
  }

  return <form className="evidence-upload" onSubmit={upload} aria-label={label}>
    <label htmlFor={`${fileFieldId}-file`}>{label}</label>
    <input id={`${fileFieldId}-file`} name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required />
    <button className="button" type="submit" disabled={state.kind === "busy"}>{state.kind === "busy" ? "Uploading…" : "Upload private file"}</button>
    {state.kind === "error" ? <p className="operation-error" role="alert">{state.message}</p> : state.kind === "ok" ? <p className="operation-success" role="status">{state.message}</p> : null}
  </form>;
}

function FileList({ item }: { item: EvidenceItemView }) {
  if (!item.files.length) return <p className="operation-empty">No private file is attached.</p>;
  return <ul className="operation-list">{item.files.map((file) => <li key={file.id}>
    <div>
      <strong>{file.originalFilename}</strong>
      <span>Version {file.version} · {Math.max(1, Math.round(file.sizeBytes / 1024))} KB · {file.archivedAt ? "replaced" : "current"}</span>
    </div>
    {!file.archivedAt ? <a className="button" href={`/api/evidence/files/${file.id}`} target="_blank" rel="noreferrer">{file.canPreview ? "Preview file" : "Download file"}</a> : null}
  </li>)}</ul>;
}

function OwnerItem({ item, skills }: { item: EvidenceItemView; skills: SkillOption[] }) {
  return <article className="evidence-item" id={`evidence-${item.id}`}>
    <div className="evidence-item-head">
      <div><strong>{item.title}</strong><span>{item.issuer ? `${item.issuer} · ` : ""}{expiryText(item)}{item.relatedSkillName ? ` · ${item.relatedSkillName}` : ""}</span></div>
      <Badges item={item} />
    </div>
    {item.details ? <p>{item.details}</p> : null}
    {item.externalUrl ? <a className="operation-link" href={item.externalUrl} target="_blank" rel="noreferrer noopener">Open portfolio link</a> : null}
    <FileList item={item} />
    {!item.archivedAt ? <>
      <FileUploader evidenceId={item.id} version={item.version} label="Attach or replace file" />
      <details className="evidence-edit">
        <summary>Edit this item</summary>
        <Form action={updateEvidenceAction} title={`Edit ${item.title}`} submit="Save changes">
          <input type="hidden" name="evidenceId" value={item.id} />
          <input type="hidden" name="expectedVersion" value={item.version} />
          <EvidenceFields item={item} kind={item.kind} skills={skills} />
        </Form>
      </details>
      <Form action={archiveEvidenceAction} title={`Archive ${item.title}`} submit="Archive">
        <input type="hidden" name="evidenceId" value={item.id} />
        <input type="hidden" name="expectedVersion" value={item.version} />
        <p className="operation-help">Archiving preserves history and removes the item from active lists.</p>
      </Form>
    </> : null}
  </article>;
}

/** Owner experience: immediate saves, no approval gate, one active CV per owner. */
export function CapabilityEvidencePanel({ items, skills }: { items: EvidenceItemView[]; skills: SkillOption[] }) {
  const [submissionKeys] = useState(() => Object.fromEntries(sections.map((section) => [section.kind, newSubmissionKey()])));
  return <section className="operations-page evidence-page" aria-labelledby="evidence-title">
    <header className="operations-heading"><div>
      <p className="eyebrow">Phase 9 · My capability evidence</p>
      <h2 id="evidence-title">My capability evidence</h2>
      <p>Certifications, portfolio, project examples, CV, and supporting documents save immediately and notify Super Admin. Review and verification are optional and never block you. Private files are visible only to you and Super Admin.</p>
    </div></header>
    {sections.map((section) => {
      const sectionItems = items.filter((item) => item.kind === section.kind);
      const active = sectionItems.filter((item) => !item.archivedAt);
      const archived = sectionItems.filter((item) => item.archivedAt);
      return <section className="operation-panel" key={section.kind} aria-labelledby={`evidence-${section.kind}-title`}>
        <h3 id={`evidence-${section.kind}-title`}>{section.title}</h3>
        <p>{section.help}</p>
        <Form action={createEvidenceAction} title={`Add ${section.title.toLowerCase()}`} submit="Save evidence">
          <input type="hidden" name="submissionKey" value={submissionKeys[section.kind]} />
          <EvidenceFields kind={section.kind} skills={skills} />
        </Form>
        {active.length ? <div className="evidence-list">{active.map((item) => <OwnerItem key={item.id} item={item} skills={skills} />)}</div> : <p className="operation-empty">Nothing recorded in this section yet.</p>}
        {archived.length ? <details className="evidence-archive"><summary>{archived.length} archived item{archived.length === 1 ? "" : "s"}</summary><ul className="operation-list">{archived.map((item) => <li key={item.id}><div><strong>{item.title}</strong><span>Archived · {expiryText(item)}</span></div></li>)}</ul></details> : null}
      </section>;
    })}
  </section>;
}

/** Super Admin review surface, anchored per item so Phase 9 notifications can deep-link here. */
export function EvidenceReviewPanel({ items, skills, employeeUserId, employeeName }: { items: EvidenceItemView[]; skills: SkillOption[]; employeeUserId: string; employeeName: string }) {
  const active = items.filter((item) => !item.archivedAt);
  return <section className="operations-page evidence-page" aria-labelledby="evidence-review-title">
    <header className="operations-heading"><div>
      <p className="eyebrow">Phase 9 · Capability evidence review</p>
      <h2 id="evidence-review-title">Capability evidence</h2>
      <p>Evidence recorded by {employeeName}. Review and verification are optional and informational. They never change coverage, replacement eligibility, schedules, or the employee&apos;s ability to see their own evidence.</p>
    </div></header>
    {active.length ? <div className="evidence-list">{active.map((item) => <article className="evidence-item" key={item.id} id={`evidence-${item.id}`}>
      <div className="evidence-item-head">
        <div><strong>{item.title}</strong><span>{item.kind.replace("_", " ")} · {item.issuer ? `${item.issuer} · ` : ""}{expiryText(item)}{item.relatedSkillName ? ` · ${item.relatedSkillName}` : ""}</span></div>
        <Badges item={item} />
      </div>
      {item.details ? <p>{item.details}</p> : null}
      {item.externalUrl ? <a className="operation-link" href={item.externalUrl} target="_blank" rel="noreferrer noopener">Open portfolio link</a> : null}
      <FileList item={item} />
      <div className="evidence-review-actions">
        <Form action={reviewEvidenceAction} title={`Mark ${item.title} reviewed`} submit="Mark reviewed">
          <input type="hidden" name="evidenceId" value={item.id} /><input type="hidden" name="expectedVersion" value={item.version} /><input type="hidden" name="state" value="reviewed" /><input type="hidden" name="ownerUserId" value={employeeUserId} />
        </Form>
        <Form action={reviewEvidenceAction} title={`Verify ${item.title}`} submit="Mark verified">
          <input type="hidden" name="evidenceId" value={item.id} /><input type="hidden" name="expectedVersion" value={item.version} /><input type="hidden" name="state" value="verified" /><input type="hidden" name="ownerUserId" value={employeeUserId} />
        </Form>
        <Form action={reviewEvidenceAction} title={`Reset review state for ${item.title}`} submit="Reset to not reviewed">
          <input type="hidden" name="evidenceId" value={item.id} /><input type="hidden" name="expectedVersion" value={item.version} /><input type="hidden" name="state" value="unreviewed" /><input type="hidden" name="ownerUserId" value={employeeUserId} />
        </Form>
      </div>
      <p className="operation-help">Edits use the recorded version {item.version}; a stale change is rejected instead of overwriting newer work.</p>
    </article>)}</div> : <p className="operation-empty">No active capability evidence is recorded for this employee.</p>}
    <p className="operation-help">Files are delivered only through authorized, audited requests; no public or permanent link exists. Skills: {skills.length} active catalogue skill{skills.length === 1 ? "" : "s"} available for related-skill metadata.</p>
  </section>;
}

/** Scoped-Admin projection: certification summary facts only. No files, links, or detail are projected. */
export function CertificationSummaryPanel({ rows, employeeName }: { rows: CertificationSummaryView[]; employeeName: string }) {
  return <section className="operations-page evidence-page" aria-labelledby="evidence-summary-title">
    <header className="operations-heading"><div>
      <p className="eyebrow">Phase 9 · Certification summary</p>
      <h2 id="evidence-summary-title">Certification summary</h2>
      <p>Certifications recorded by {employeeName}. Scoped Admin view: title, issuer, dates, related skill, and verification state only. CVs, supporting documents, portfolio files and links, and project-example detail are withheld.</p>
    </div></header>
    {rows.length ? <ul className="operation-list">{rows.map((row) => <li key={row.id} id={`evidence-${row.id}`}><div><strong>{row.title}</strong><span>{row.issuer ? `${row.issuer} · ` : ""}{expiryText({ expiryDate: row.expiryDate, expiryStatus: row.expiryStatus } as EvidenceItemView)}{row.relatedSkillName ? ` · ${row.relatedSkillName}` : ""}</span><span>{row.reviewState === "verified" ? "Verified" : row.reviewState === "reviewed" ? "Reviewed" : "Not reviewed"}</span></div></li>)}</ul> : <p className="operation-empty">No certification summary is recorded for this employee.</p>}
  </section>;
}
