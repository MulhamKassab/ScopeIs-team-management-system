import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "@/app/styles.css";
import "@/app/phase10.css";
import "@/app/phase11.css";
import "@/app/account.css";
import "@/app/design.css";
import "@/app/records.css";
import "@/app/people.css";
import "@/app/workflows.css";
import "@/app/secondary.css";
import "@/app/responsive.css";
import "@/app/visuals.css";
import "@/app/experience.css";
import "@/app/route-motion.css";
import "@/app/motion.css";
import { directionSchema } from "@/shared/validation/foundation";
import { ThemeBootScript } from "@/shared/components/theme-provider";
import { AppMotion } from "@/shared/components/app-motion";

export const metadata: Metadata = { title: "ScopeIs Team Management", description: "ScopeIs internal workforce planning foundation" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", interactiveWidget: "resizes-content" };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const candidate = (await cookies()).get("scopeis-direction")?.value; const direction = directionSchema.safeParse(candidate).data ?? "ltr";
  return <html lang="en" dir={direction} suppressHydrationWarning><body><ThemeBootScript /><AppMotion />{children}</body></html>;
}
