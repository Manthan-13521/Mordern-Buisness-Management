"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Compact theme toggle button for sidebars.
 * Avoids hydration mismatch by waiting for mount.
 * Works correctly in both light and dark themes.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors
        text-[#9ca3af] hover:bg-[#8b5cf6]/10 hover:text-[#f9fafb]"
      aria-label="Toggle Theme"
      id="theme-toggle-btn"
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4" />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span>Dark Mode</span>
        </>
      )}
    </button>
  );
}
