import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { can } from "@/modules/authorization/authorization-service";
import { NotificationCentre } from "@/modules/notifications/forms";
import { notificationService } from "@/modules/notifications/service";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string; page?: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (!can(actor, "module:notifications:view")) notFound();
  const query = await searchParams;
  const view = await notificationService.inbox(actor, { filter: query.filter, page: query.page });
  return <NotificationCentre view={view} filter={view.filter} />;
}
