"use client";

import { AnimatePresence, domAnimation, LazyMotion, m, MotionConfig, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** A deliberately small shared vocabulary for the database-free Preview only. */
export const motionTokens = {
  immediate: 0.1,
  fast: 0.16,
  normal: 0.24,
  expressive: 0.38,
  distance: 8,
  pressScale: 0.98,
  stagger: 0.045,
  ease: [0.2, 0.8, 0.2, 1] as const,
} as const;

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user" transition={{ duration: motionTokens.normal, ease: motionTokens.ease }}>
      {children}
    </MotionConfig>
  </LazyMotion>;
}

export function PageTransition({ routeKey, children }: { routeKey: string; children: React.ReactNode }) {
  return <AnimatePresence mode="wait" initial={false}>
    <m.div key={routeKey} className="motion-page" initial={{ opacity: 0, y: motionTokens.distance }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
      {children}
    </m.div>
  </AnimatePresence>;
}

export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <m.div className={className} initial={{ opacity: 0, y: motionTokens.distance }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: motionTokens.normal }}>
    {children}
  </m.div>;
}

export function AnimatedCounter({ value, className }: { value: string | number; className?: string }) {
  const reduced = useReducedMotion();
  const parsed = typeof value === "number" ? value : Number(value.replace(/[^\d.-]/g, ""));
  const prefix = typeof value === "string" ? value.match(/^[^\d.-]*/)?.[0] ?? "" : "";
  const suffix = typeof value === "string" ? value.match(/[^\d.-]*$/)?.[0] ?? "" : "";
  const canAnimate = Number.isFinite(parsed) && !reduced;
  const [display, setDisplay] = useState(parsed);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!canAnimate) return;
    const start = performance.now();
    const duration = 560;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(parsed * eased);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(() => { setDisplay(0); frame.current = requestAnimationFrame(tick); });
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, [canAnimate, parsed]);

  if (!Number.isFinite(parsed)) return <span className={className}>{value}</span>;
  return <span className={className} aria-label={`${prefix}${parsed}${suffix}`}>{prefix}{Math.round(display)}{suffix}</span>;
}

export function LoadingSkeleton({ label = "Loading interface content", variant = "page" }: { label?: string; variant?: "page" | "map" | "chart" }) {
  return <section className={`loading-skeleton loading-skeleton-${variant}`} role="status" aria-live="polite" aria-label={label}>
    <span className="loading-skeleton-line wide" />
    <span className="loading-skeleton-line" />
    <span className="loading-skeleton-block" />
    <span className="sr-only">{label}</span>
  </section>;
}
