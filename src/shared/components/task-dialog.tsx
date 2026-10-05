"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

function animationTime(value: string) {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount * (value.trim().endsWith("ms") ? 1 : 1000) : 0;
}

function closingAnimation(style: CSSStyleDeclaration) {
  const names = style.animationName.split(",").map((name) => name.trim());
  const durations = style.animationDuration.split(",");
  const delays = style.animationDelay.split(",");
  const iterations = style.animationIterationCount.split(",");
  const animations = names.map((name, index) => {
    const duration = animationTime(durations[index % durations.length]);
    const count = Number(iterations[index % iterations.length] || "1");
    const end = Math.max(0, duration * count + animationTime(delays[index % delays.length]));
    return { name, end: name && name !== "none" && duration > 0 && Number.isFinite(count) && count > 0 ? end : 0 };
  });
  const duration = Math.max(0, ...animations.map((animation) => animation.end));
  return { duration, names: new Set(animations.filter((animation) => animation.end === duration && duration > 0).map((animation) => animation.name)) };
}

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
  const closing = useRef(false);
  const clearExit = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);

  const show = () => {
    // A valid repeat activation can arrive before the previous exit has finished.
    // Remove its listeners before restarting CSS so a queued cancel cannot dismiss this task.
    clearExit.current?.();
    clearExit.current = null;
    closing.current = false;
    const element = dialog.current;
    if (element?.open) {
      element.dataset.motionState = "open";
      const focusTarget = element.querySelector<HTMLElement>("[data-dialog-autofocus]")
        ?? element.querySelector<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]");
      focusTarget?.focus();
    }
    setOpen(true);
  };

  const dismiss = (animate = true) => {
    const element = dialog.current;
    const finish = () => {
      clearExit.current?.();
      clearExit.current = null;
      closing.current = false;
      setOpen(false);
    };
    // A selected link must be able to navigate immediately, including during an exit.
    if (!animate || !element?.open) { finish(); return; }
    if (closing.current) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || typeof element.getAnimations !== "function") { finish(); return; }

    closing.current = true;
    element.dataset.motionState = "closing";
    const animation = closingAnimation(window.getComputedStyle(element));
    if (!animation.duration) { finish(); return; }

    const onAnimationFinished = (event: AnimationEvent) => {
      // Child and backdrop animations must not release the native modal early.
      if (event.target === element && !event.pseudoElement && animation.names.has(event.animationName)) finish();
    };
    element.addEventListener("animationend", onAnimationFinished);
    element.addEventListener("animationcancel", onAnimationFinished);
    // Keep dismissal finite even if a browser or stylesheet suppresses its end event.
    const timeout = window.setTimeout(finish, Math.min(animation.duration, 2000) + 80);
    clearExit.current = () => {
      window.clearTimeout(timeout);
      element.removeEventListener("animationend", onAnimationFinished);
      element.removeEventListener("animationcancel", onAnimationFinished);
    };
  };

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const returnTo = trigger.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const returnSection = returnTo?.closest("section");
    const previousOverflow = document.body.style.overflow;
    if (element) element.dataset.motionState = "open";
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
      clearExit.current?.();
      clearExit.current = null;
      closing.current = false;
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      element?.style.removeProperty("--dialog-viewport-height");
      element?.style.removeProperty("--dialog-viewport-offset");
      if (element) delete element.dataset.motionState;
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
    <button ref={trigger} type="button" className={triggerClassName} disabled={triggerDisabled} aria-haspopup="dialog" aria-label={triggerLabel} onClick={show}>{triggerIcon}<span>{triggerLabel}</span></button>
    <dialog ref={dialog} className="task-dialog" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined}
      onCancel={(event) => { event.preventDefault(); dismiss(); }} onClose={() => setOpen(false)}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dismiss();
      }}>
      {open ? <>
        <header className="task-dialog-heading"><div><h2 id={`${id}-title`}>{title}</h2>{description ? <p id={`${id}-description`}>{description}</p> : null}</div><button type="button" className="icon-button" aria-label="Close" onClick={() => dismiss()}><X size={20} aria-hidden="true" /></button></header>
        <div className="task-dialog-content" onClick={dismissOnNavigate ? (event) => { if ((event.target as Element).closest("a[href]")) dismiss(false); } : undefined}>{children}</div>
      </> : null}
    </dialog>
  </>;
}
