"use client";

import Link from "next/link";
import { Waves, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { ContactSupportModal } from "./ContactSupportModal";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Instead of using mounted states (which Next.js hydration complains about), 
  // we render both icons and use CSS to toggle their visibility based on the dark mode class.
  // This guarantees the server HTML and client HTML are identically matched at all times.
  return (
    <>
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
            <Link 
              href="/blog" 
              className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Blog
            </Link>
            <Link 
              href="/#pricing" 
              className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Pricing
            </Link>
          </div>

          <div className="flex flex-1 justify-end items-center gap-3 sm:gap-4">
            <div className="w-9 h-9 flex items-center justify-center">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition"
                aria-label="Toggle Theme"
              >
                {/* CSS handles the visibility to avoid hydration errors entirely */}
                <Sun className="h-5 w-5 text-gray-100 hidden dark:block" />
                <Moon className="h-5 w-5 text-gray-900 block dark:hidden" />
              </button>
            </div>

            {/* Desktop Contact CTA */}
            <button
              onClick={() => setIsContactOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-full border border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:scale-[1.02] transition-all backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span>Need a Setup Guide?</span>
            </button>

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

      {/* The modal state naturally prevents SSR hydration mismatches because isOpen defaults to false */}
      <ContactSupportModal 
        isOpen={isContactOpen} 
        onClose={() => setIsContactOpen(false)} 
      />
    </>
  );
}
