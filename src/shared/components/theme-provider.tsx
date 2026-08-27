"use client";

import { useState } from "react";

type Theme = "light" | "dark";
function applyTheme(theme: Theme) { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  return <button className="icon-button" type="button" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} onClick={() => { const next = theme === "light" ? "dark" : "light"; setTheme(next); localStorage.setItem("scopeis-theme", next); applyTheme(next); }}>{theme === "light" ? "◐" : "☼"}</button>;
}

export function ThemeBootScript() {
  const code = "try{var t=localStorage.getItem('scopeis-theme');var v=t==='dark'?'dark':'light';document.documentElement.dataset.theme=v;document.documentElement.style.colorScheme=v}catch(e){}";
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
