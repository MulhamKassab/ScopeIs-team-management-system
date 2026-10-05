"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

const completionEvent = "scopeis:workflow-completed";
/** Called only after a Server Action returns a confirmed success. */
export function announceWorkflowSuccess(result: { success?: string }) {
  if (result.success) window.dispatchEvent(new CustomEvent<string>(completionEvent, { detail: result.success }));
}

/** Lives outside changing records so a completed task can remove its own form safely. */
export function WorkflowFeedback() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    const onComplete = (event: Event) => {
      const value: unknown = (event as CustomEvent<unknown>).detail;
      if (typeof value === "string" && value) setMessage(value);
    };
    window.addEventListener(completionEvent, onComplete);
    return () => window.removeEventListener(completionEvent, onComplete);
  }, []);
  return <div className="workflow-feedback" role="status" aria-live="polite" aria-atomic="true">{message ? <><CheckCircle2 size={19} aria-hidden="true" /><span>{message}</span><button type="button" className="icon-button" aria-label="Dismiss confirmation" onClick={() => setMessage("")}><X size={17} aria-hidden="true" /></button></> : null}</div>;
}
