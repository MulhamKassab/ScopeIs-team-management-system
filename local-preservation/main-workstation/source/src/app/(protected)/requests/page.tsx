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
    <header className="operations-heading"><div><p className="eyebrow">Your work</p><h2>My requests</h2><p>Follow the coverage and replacement requests that include you. Discussions are private to the people on each request.</p></div></header>
    {threads.length
      ? <section className="operation-panel"><h2>Your conversations</h2>{threads.map((thread) => <DiscussionPanel key={thread.requestId} thread={thread} heading={`Request · ${thread.intent === "REPLACE_ASSIGNMENT" ? "Replacement" : "Extra support"} · ${thread.status === "PENDING" ? "Awaiting decision" : thread.status === "APPROVED" ? "Approved · Draft prepared" : "Declined"}`} />)}</section>
      : <p className="operation-empty">No request currently includes you as a participant.</p>}
  </section>;
}
