"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

export type Theme = "dark" | "light";

const STORAGE_KEY = "campusone-theme";
const THEME_COLOR: Record<Theme, string> = { dark: "#031716", light: "#eef4f3" };
const listeners = new Set<() => void>();

/**
 * Runs inline in <head> before first paint so a saved light theme never flashes dark.
 * A `?theme=light|dark` URL param also sets (and saves) the theme, for shareable links.
 * Keep it dependency-free: it is stringified into the page.
 */
export const themeInitScript = `(function(){try{var q=new URLSearchParams(location.search).get("theme");if(q==="light"||q==="dark"){localStorage.setItem("${STORAGE_KEY}",q);}var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light"){document.documentElement.dataset.theme="light";}}catch(e){}})();`;

function read(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;
  // Ease the colour swap for one frame-group, then drop the transitions again.
  root.classList.add("theme-switching");
  if (theme === "light") root.dataset.theme = "light";
  else delete root.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private mode: the choice just won't persist */
  }
  window.setTimeout(() => root.classList.remove("theme-switching"), 260);
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "dark",
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] text-muted transition-[color,background-color,transform] duration-150 ease-snappy hover:bg-surface-2 hover:text-ink active:scale-[0.94]",
        className,
      )}
    >
      {/* Icons cross-fade with a small rotate rather than popping. */}
      <Sun
        className={cn(
          "absolute size-4 transition-[opacity,transform] duration-200 ease-snappy",
          theme === "light" ? "rotate-0 opacity-100" : "-rotate-45 scale-90 opacity-0",
        )}
      />
      <Moon
        className={cn(
          "absolute size-4 transition-[opacity,transform] duration-200 ease-snappy",
          theme === "dark" ? "rotate-0 opacity-100" : "rotate-45 scale-90 opacity-0",
        )}
      />
    </button>
  );
}

export function ThemedToaster() {
  const theme = useTheme();
  return <Toaster theme={theme} position="bottom-right" />;
}
