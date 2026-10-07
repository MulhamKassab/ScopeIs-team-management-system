"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CircleHelp } from "lucide-react";
import type { ModuleDefinition } from "@/modules/navigation/navigation";
import { pageJourney } from "@/modules/navigation/page-journeys";
import type { SystemRole } from "@/shared/types/foundation";

/** All destinations come from the server-authorized navigation; help never grants access. */
export function PageJourneyHelp({ navigation, role }: { navigation: ModuleDefinition[]; role: SystemRole }) {
  const pathname = usePathname();
  const active = navigation.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (!active) return null;
  const journey = pageJourney(active.key, role);
  const related = journey.related.flatMap((key) => navigation.filter((item) => item.key === key));
  return <div className="page-journey-bar">
    <details className="page-journey-help" key={pathname}>
      <summary><CircleHelp size={17} aria-hidden="true" />How to use {active.label}</summary>
      <div className="page-journey-content"><p className="journey-goal">{journey.goal}</p><ol>{journey.steps.map((item) => <li key={item.title}><strong>{item.title}</strong><p>{item.detail}</p></li>)}</ol>
        {related.length ? <nav aria-label={`Related tools for ${active.label}`}>{related.map((item) => <Link className="button" key={item.key} href={item.href}>{item.label}<ArrowRight size={15} aria-hidden="true" /></Link>)}</nav> : null}
      </div>
    </details>
  </div>;
}
