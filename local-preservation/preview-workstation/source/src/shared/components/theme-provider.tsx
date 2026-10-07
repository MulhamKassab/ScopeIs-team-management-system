"use client";

import { IconLanguage, IconMoon, IconSun } from "@tabler/icons-react";

type Theme = "light" | "dark";
function applyTheme(theme: Theme) { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }

export function ThemeToggle() {
  return <button className="icon-button theme-toggle" type="button" title="Toggle color theme" aria-label="Toggle color theme" onClick={() => {
    const next: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("scopeis-theme", next);
    applyTheme(next);
  }}><IconMoon className="theme-moon" aria-hidden="true" /><IconSun className="theme-sun" aria-hidden="true" /></button>;
}

export function DirectionToggle() {
  return <button className="icon-button" type="button" title="Toggle layout direction" aria-label="Toggle layout direction" onClick={() => {
    const next = document.documentElement.dir === "rtl" ? "ltr" : "rtl";
    document.documentElement.dir = next;
    document.cookie = `scopeis-direction=${next}; path=/; max-age=31536000; samesite=lax`;
  }}><IconLanguage aria-hidden="true" /></button>;
}

export function ThemeBootScript() {
  const code = "try{var t=localStorage.getItem('scopeis-theme');var v=t==='dark'?'dark':'light';document.documentElement.dataset.theme=v;document.documentElement.style.colorScheme=v}catch(e){}";
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
