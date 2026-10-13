"use client";
import { SafeState } from "@/shared/components/states";

export default function ErrorPage() { return <SafeState as="section" title="Something went wrong" message="No internal details were exposed. Return to a safe page and try again." />; }
