import type { Metadata } from "next";
import "@/app/styles.css";
import "@/app/motion.css";

export const metadata: Metadata = { title: "ScopeIs Preview", description: "Database-free fictional frontend demonstration" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" dir="ltr" suppressHydrationWarning><body>{children}</body></html>; }
