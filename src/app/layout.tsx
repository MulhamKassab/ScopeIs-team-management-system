import type { Metadata } from "next";
import { cookies } from "next/headers";
import "@/app/styles.css";
import { directionSchema } from "@/shared/validation/foundation";
import { ThemeBootScript } from "@/shared/components/theme-provider";

export const metadata: Metadata = { title: "ScopeIs Team Management", description: "ScopeIs internal workforce planning foundation" };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const candidate = (await cookies()).get("scopeis-direction")?.value; const direction = directionSchema.safeParse(candidate).data ?? "ltr";
  return <html lang="en" dir={direction} suppressHydrationWarning><body><ThemeBootScript />{children}</body></html>;
}
