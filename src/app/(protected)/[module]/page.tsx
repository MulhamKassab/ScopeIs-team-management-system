import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { requireCapability } from "@/modules/authorization/authorization-service";
import { moduleForPathSegment } from "@/modules/navigation/navigation";
import { EmptyModule } from "@/shared/components/states";

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) { const moduleDefinition = moduleForPathSegment((await params).module); if (!moduleDefinition) notFound(); const actor = await getCurrentActor(); if (!actor) redirect("/login"); requireCapability(actor, moduleDefinition.capability); return <EmptyModule title={moduleDefinition.label} purpose={moduleDefinition.purpose} phase={moduleDefinition.phase} />; }
