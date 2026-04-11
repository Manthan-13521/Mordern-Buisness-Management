"use client";

import Link from "next/link";
import { Waves, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 dark:bg-black/40 border-b border-gray-200 dark:border-white/10 transition-colors duration-300">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
            <span className="sr-only">AquaSync</span>
            <Waves className="h-8 w-8 text-blue-500" />
            <span className="text-xl font-bold dark:text-white">AquaSync SaaS</span>
          </Link>
        </div>
        
        <div className="hidden lg:flex lg:gap-x-12">
          <Link href="#features" className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:text-blue-500 transition">Features</Link>
          <Link href="#why-aquasync" className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:text-blue-500 transition">Why AquaSync?</Link>
          <Link href="#pricing" className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:text-blue-500 transition">Pricing</Link>
        </div>

        <div className="flex flex-1 justify-end items-center gap-4">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5 text-gray-100" /> : <Moon className="h-5 w-5 text-gray-900" />}
            </button>
          )}

          <Link 
            href="/login" 
            className="inline-flex text-xs sm:text-sm font-semibold leading-6 text-white border border-transparent rounded-full px-3 py-1.5 sm:px-5 sm:py-2 transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-purple))' }}
          >
            Admin Login
          </Link>
        </div>
      </nav>
    </header>
  );
}
