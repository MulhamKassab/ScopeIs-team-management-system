"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
function applyTheme(theme: Theme) { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; window.dispatchEvent(new Event("scopeis-theme-change")); }
function subscribe(listener: () => void) { window.addEventListener("scopeis-theme-change", listener); return () => window.removeEventListener("scopeis-theme-change", listener); }
function themeSnapshot(): Theme { return document.documentElement.dataset.theme === "dark" ? "dark" : "light"; }

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, themeSnapshot, () => "light" as Theme);
  return <button className="icon-button theme-toggle" type="button" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} onClick={() => { const next = theme === "light" ? "dark" : "light"; try { localStorage.setItem("scopeis-theme", next); } catch { /* The theme remains usable when browser storage is disabled. */ } applyTheme(next); }}><span className="theme-toggle-icon" key={theme} aria-hidden="true">{theme === "light" ? <Moon size={19} /> : <Sun size={19} />}</span></button>;
}

export function ThemeBootScript() {
  const code = "try{var t=localStorage.getItem('scopeis-theme');var v=t==='dark'?'dark':'light';document.documentElement.dataset.theme=v;document.documentElement.style.colorScheme=v}catch(e){}";
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
