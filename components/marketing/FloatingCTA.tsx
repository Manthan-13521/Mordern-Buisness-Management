"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";

export function FloatingCTA() {
  return (
    <div className="fixed bottom-6 right-6 z-[90] animate-in slide-in-from-bottom-5 fade-in duration-300">
      {/* Outer pulsing ring for highlight effect */}
      <div className="absolute -inset-1 rounded-full bg-blue-500 opacity-20 blur animate-pulse" />
      
      <Link 
        href="/demo?source=floating_cta"
        className="relative flex items-center justify-center gap-2 rounded-full py-3.5 px-6 text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:scale-105 active:scale-95 m-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/30 group"
      >
        <Calendar className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
        <span>Book Free Demo</span>
      </Link>
    </div>
  );
}
