import type {} from "react/canary";
import { ViewTransition } from "react";

// Next's bundled React supports ViewTransition. Query changes keep the existing
// template and form state; navigation animates only the workspace content.
export default function WorkspaceTemplate({ children }: { children: React.ReactNode }) {
  return <ViewTransition enter="scopeis-route-arrive" exit="scopeis-route-depart" default="none"><div className="workspace-route">{children}</div></ViewTransition>;
}
