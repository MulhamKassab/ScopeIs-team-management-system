import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { can } from "@/modules/authorization/authorization-service";
import { DiscussionPanel } from "@/modules/discussions/forms";
import { discussionService } from "@/modules/discussions/service";

export const dynamic = "force-dynamic";

/**
 * Phase 10: the employee-facing surface for the requests they participate in. Only requests this actor
 * is a named participant on are listed, and the service re-authorizes every read and write.
 */
export default async function RequestsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (!can(actor, "module:requests:view")) notFound();
  const participating = await discussionService.listMine(actor);
  const threads = await Promise.all(participating.threads.map((thread) => discussionService.openThread(actor, thread.requestId)));
  return <section className="operations-page">
    <header className="operations-heading"><div><p className="eyebrow">Phase 10 requests and discussions</p><h2>My requests</h2><p>These are the coverage and replacement requests you were named on. Discussion is visible only to the people on the request.</p></div></header>
    {threads.length
      ? <section className="operation-panel"><h2>Request discussions</h2>{threads.map((thread) => <DiscussionPanel key={thread.requestId} thread={thread} heading={`Request · ${thread.intent === "REPLACE_ASSIGNMENT" ? "Replace assignment employee" : "Add coverage assignment"} (${thread.status})`} />)}</section>
      : <p className="operation-empty">No request currently includes you as a participant.</p>}
  </section>;
}
