"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

export function FloatingCTA() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <Link 
        href="#features"
        className="flex items-center gap-2 rounded-full py-3 px-6 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 active:scale-95 m-0"
        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-purple))' }}
      >
        <span>Get Started</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
