"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import type { ModuleDefinition } from "@/modules/navigation/navigation";
import { featureDescription, findWorkspaceFeatures, navigationGroupsFor } from "@/modules/navigation/workspace-guide";
import type { SystemRole } from "@/shared/types/foundation";
import { TaskDialog } from "@/shared/components/task-dialog";

function FeatureList({ navigation, role }: { navigation: ModuleDefinition[]; role: SystemRole }) {
  const [query, setQuery] = useState("");
  const features = findWorkspaceFeatures(navigation, role, query);
  return <div className="workspace-feature-guide">
    <label className="workspace-feature-search"><Search size={20} aria-hidden="true" /><span className="sr-only">Search workspace features</span><input type="search" data-dialog-autofocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools" /></label>
    <p className="workspace-feature-count" role="status">{features.length} feature{features.length === 1 ? "" : "s"} available in your workspace</p>
    {navigationGroupsFor(role).map((group) => {
      const items = group.keys.flatMap((key) => features.filter((item) => item.key === key));
      return items.length ? <section key={group.label} className="workspace-feature-group" aria-label={group.label}><h3>{group.label}</h3><ul>{items.map((item) => <li key={item.key}><Link href={item.href}><span><strong>{item.label}</strong><span>{featureDescription(item.key, role)}</span></span><ArrowUpRight size={19} aria-hidden="true" /></Link></li>)}</ul></section> : null;
    })}
    {!features.length ? <div className="workspace-feature-empty"><h3>No matching feature</h3><p>Try a shorter name or the task you want to do.</p><button type="button" className="button" onClick={() => setQuery("")}>Show all features</button></div> : null}
  </div>;
}

export function WorkspaceGuide({ navigation, role }: { navigation: ModuleDefinition[]; role: SystemRole }) {
  return <TaskDialog triggerLabel="Find a feature" triggerIcon={<Search size={18} aria-hidden="true" />} triggerClassName="button workspace-feature-trigger" title="What would you like to do?" description="Find tools by name or by the task you want to complete." dismissOnNavigate><FeatureList navigation={navigation} role={role} /></TaskDialog>;
}
