"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

/** A focused task with native modal semantics. Form feedback remains visible until closed. */
export function TaskDialog({ triggerLabel, triggerIcon, title, description, children, triggerClassName = "button primary", triggerDisabled = false, dismissOnNavigate = false }: {
  triggerLabel: string;
  triggerIcon?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  triggerClassName?: string;
  triggerDisabled?: boolean;
  dismissOnNavigate?: boolean;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const returnTo = trigger.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const returnSection = returnTo?.closest("section");
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    element?.querySelector<HTMLElement>("[data-dialog-autofocus]")?.focus();
    document.body.style.overflow = "hidden";
    const viewport = window.visualViewport;
    const updateViewport = () => {
      if (!element || !viewport) return;
      // A keyboard can shrink the visible area without changing CSS vh/dvh, especially on iOS.
      // Pinch zoom remains under browser control rather than resizing the task around the zoom.
      if (viewport.scale === 1) {
        element.style.setProperty("--dialog-viewport-height", `${viewport.height}px`);
        element.style.setProperty("--dialog-viewport-offset", `${viewport.offsetTop}px`);
      } else {
        element.style.removeProperty("--dialog-viewport-height");
        element.style.removeProperty("--dialog-viewport-offset");
      }
    };
    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    return () => {
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      element?.style.removeProperty("--dialog-viewport-height");
      element?.style.removeProperty("--dialog-viewport-offset");
      if (element?.open) element.close();
      document.body.style.overflow = previousOverflow;
      if (returnTo?.isConnected && !returnTo.hasAttribute("disabled")) returnTo.focus();
      else {
        // A successful task can disable its trigger or remove its record entirely.
        const fallback = returnSection?.isConnected
          ? returnSection.querySelector<HTMLElement>("h2, h3, h4") ?? returnSection
          : document.getElementById("page-content");
        if (fallback) { if (!fallback.hasAttribute("tabindex")) fallback.setAttribute("tabindex", "-1"); fallback.focus(); }
      }
    };
  }, [open]);

  return <>
    <button ref={trigger} type="button" className={triggerClassName} disabled={triggerDisabled} aria-haspopup="dialog" aria-label={triggerLabel} onClick={() => setOpen(true)}>{triggerIcon}<span>{triggerLabel}</span></button>
    <dialog ref={dialog} className="task-dialog" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined}
      onCancel={() => setOpen(false)} onClose={() => setOpen(false)}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setOpen(false);
      }}>
      {open ? <>
        <header className="task-dialog-heading"><div><h2 id={`${id}-title`}>{title}</h2>{description ? <p id={`${id}-description`}>{description}</p> : null}</div><button type="button" className="icon-button" aria-label="Close" onClick={() => setOpen(false)}><X size={20} aria-hidden="true" /></button></header>
        <div className="task-dialog-content" onClick={dismissOnNavigate ? (event) => { if ((event.target as Element).closest("a[href]")) setOpen(false); } : undefined}>{children}</div>
      </> : null}
    </dialog>
  </>;
}
