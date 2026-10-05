"use client";

import { useEffect } from "react";

const revealSelector = [
  "#page-content .operations-heading", "#page-content .people-page-heading", "#page-content .schedule-heading",
  "#page-content .map-page-heading", "#page-content .directory-heading", "#page-content .reporting-group-heading",
  "#page-content h1", "#page-content .operation-panel", "#page-content .schedule-panel",
  "#page-content .reporting-cards > li", "#page-content .workspace-shortcuts > a",
  "#page-content .planning-map-detail", "#page-content .planning-map-list",
  ".workspace-feature-group li", ".task-dialog-content > form", ".state-page > h1",
].join(",");
const pressSelector = "button, a.button, a.icon-button, summary, .nav-links a, .bottom-nav a, .workspace-shortcuts a, .workspace-feature-group a, .reporting-card-link, .account-popover a";

/** Progressive, finite motion. The server-rendered content is always readable. */
export function AppMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const forced = window.matchMedia("(forced-colors: active)");
    const seen = new WeakSet<Element>();
    const pending = new Set<HTMLElement>();
    const active = new Set<HTMLElement>();
    const registered = new Set<HTMLElement>();
    const roots = new Set<Element>();
    const presses = new Map<HTMLElement, { frame: number; timeout: number }>();
    let frame = 0;
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      let index = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        element.style.setProperty("--motion-delay", `${Math.min(index++ * 35, 175)}ms`);
        element.dataset.motionVisible = "true";
        active.add(element);
        pending.delete(element);
        observer?.unobserve(element);
      }
    }, { threshold: 0.08 });

    function register(root: Element) {
      if (reduced.matches || !observer) return;
      const candidates = [...(root.matches(revealSelector) ? [root] : []), ...root.querySelectorAll<HTMLElement>(revealSelector)];
      for (const candidate of candidates) {
        if (!(candidate instanceof HTMLElement) || seen.has(candidate) || candidate.closest(".planning-map-canvas, table, [data-motion]")) continue;
        seen.add(candidate);
        registered.add(candidate);
        candidate.dataset.motion = candidate.matches("h1, [class$='heading'], .reporting-group-heading") ? "drop" : candidate.matches("a, li") ? "inline" : "rise";
        pending.add(candidate);
        observer.observe(candidate);
      }
    }
    function clearPress(element: HTMLElement) {
      const current = presses.get(element);
      if (current) { cancelAnimationFrame(current.frame); window.clearTimeout(current.timeout); }
      presses.delete(element);
      delete element.dataset.motionPress;
      element.style.removeProperty("--motion-press-x");
      element.style.removeProperty("--motion-press-y");
    }
    function press(target: EventTarget | null, x?: number, y?: number) {
      if (reduced.matches || forced.matches || !(target instanceof Element)) return;
      const element = target.closest<HTMLElement>(pressSelector);
      if (!element || element.matches(":disabled, [aria-disabled='true']") || element.closest("[inert], .planning-map-canvas")) return;
      clearPress(element);
      const rect = element.getBoundingClientRect();
      element.style.setProperty("--motion-press-x", `${x === undefined ? rect.width / 2 : x - rect.left}px`);
      element.style.setProperty("--motion-press-y", `${y === undefined ? rect.height / 2 : y - rect.top}px`);
      const current = { frame: 0, timeout: 0 };
      presses.set(element, current);
      current.frame = requestAnimationFrame(() => {
        element.dataset.motionPress = "true";
        current.timeout = window.setTimeout(() => clearPress(element), 600);
      });
    }
    const pointer = (event: PointerEvent) => { if (event.isPrimary && event.button === 0) press(event.target, event.clientX, event.clientY); };
    const keyboard = (event: KeyboardEvent) => { if (!event.repeat && (event.key === "Enter" || event.key === " ")) press(event.target); };
    const finishReveal = (event: AnimationEvent) => {
      if (event.target instanceof HTMLElement && !event.pseudoElement && /^scopeis-content-(rise|inline|drop)$/.test(event.animationName) && active.has(event.target)) {
        delete event.target.dataset.motionVisible;
        event.target.style.removeProperty("--motion-delay");
        active.delete(event.target);
      }
    };
    const preferences = () => {
      if (reduced.matches) {
        observer?.disconnect();
        for (const element of pending) { delete element.dataset.motion; seen.delete(element); registered.delete(element); }
        pending.clear();
        for (const element of active) { delete element.dataset.motionVisible; element.style.removeProperty("--motion-delay"); }
        active.clear();
      } else register(document.body);
      if (reduced.matches || forced.matches) for (const element of presses.keys()) clearPress(element);
    };
    const mutations = new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) if (node instanceof Element) roots.add(node);
      if (!roots.size || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        for (const element of pending) if (!element.isConnected) { observer?.unobserve(element); pending.delete(element); }
        for (const element of registered) if (!element.isConnected) { registered.delete(element); active.delete(element); }
        for (const root of roots) if (root.isConnected) register(root);
        roots.clear();
      });
    });
    register(document.body);
    mutations.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("pointerdown", pointer, { passive: true });
    document.addEventListener("keydown", keyboard);
    document.addEventListener("animationend", finishReveal);
    document.addEventListener("animationcancel", finishReveal);
    reduced.addEventListener("change", preferences);
    forced.addEventListener("change", preferences);
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect(); observer?.disconnect();
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", keyboard);
      document.removeEventListener("animationend", finishReveal);
      document.removeEventListener("animationcancel", finishReveal);
      reduced.removeEventListener("change", preferences);
      forced.removeEventListener("change", preferences);
      for (const element of presses.keys()) clearPress(element);
      for (const element of registered) { delete element.dataset.motion; delete element.dataset.motionVisible; element.style.removeProperty("--motion-delay"); }
    };
  }, []);
  return null;
}
