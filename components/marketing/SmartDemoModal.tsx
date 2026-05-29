"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle2, X } from "lucide-react";

export function SmartDemoModal() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isVisible, setIsVisible] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

  // List of paths where the modal should NEVER appear
  const excludedPaths = ["/demo", "/login", "/register", "/select-plan", "/renew-plan", "/subscribe", "/admin", "/superadmin"];
  const isExcluded = excludedPaths.some(path => pathname.startsWith(path));

  useEffect(() => {
    // 1. Initial Checks
    if (typeof window === "undefined") return;
    if (session) return; // Don't show to logged-in users
    if (isExcluded) return; // Don't show on restricted paths

    // Check localStorage
    const demoSubmitted = localStorage.getItem("demoSubmitted");
    if (demoSubmitted === "true") return;

    const dismissedAt = localStorage.getItem("demoModalDismissedAt");
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (new Date().getTime() - dismissedDate.getTime()) / (1000 * 3600 * 24);
      if (daysSinceDismissed < 7) {
        setHasDismissed(true);
        return;
      }
    }

    if (hasDismissed) return;

    // 2. Trigger Logic
    const handleScroll = () => {
      if (isVisible) return;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollTop = document.documentElement.scrollTop;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      if (scrollPercentage > 0.6) {
        showModal();
      }
    };

    const timer = setTimeout(() => {
      showModal();
    }, 40000); // 40 seconds

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, [session, isExcluded, isVisible, hasDismissed]);

  const showModal = () => {
    if (!isVisible) {
      setIsVisible(true);
      console.log("[Analytics] Modal Shown: scroll_modal");
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setHasDismissed(true);
    localStorage.setItem("demoModalDismissedAt", new Date().toISOString());
    console.log("[Analytics] Modal Dismissed: scroll_modal");
  };

  const handleBookDemo = () => {
    setIsVisible(false);
    console.log("[Analytics] Demo CTA Clicked: scroll_modal");
    router.push("/demo?source=scroll_modal");
  };

  // Keyboard accessibility (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        handleDismiss();
      }
    };
    if (isVisible) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div 
          className="pointer-events-auto w-full sm:w-[70vw] sm:max-w-[900px] bg-white dark:bg-[#0b1220] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 border border-gray-200 dark:border-[#1f2937]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col md:flex-row">
            {/* Image / Visual Area */}
            <div className="hidden md:flex flex-col justify-center items-center bg-blue-600 p-10 text-white w-2/5">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-center">Transform Your Business</h3>
              <p className="text-blue-100 text-center text-sm">Join thousands of operators managing everything in one place.</p>
            </div>

            {/* Content Area */}
            <div className="p-8 sm:p-12 w-full md:w-3/5">
              <h2 id="modal-headline" className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                See AquaSync in Action
              </h2>
              <p className="text-gray-600 dark:text-[#9ca3af] mb-8 leading-relaxed">
                Discover how pools, hostels, and businesses manage operations, payments, staff, and customers from one platform.
              </p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {[
                  "Member Management",
                  "Billing & Payments",
                  "Staff Management",
                  "Reports & Analytics",
                  "Subscription Management",
                  "Multi-Location Support"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-700 dark:text-[#cbd5e1] font-medium">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleBookDemo}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/30 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[#0b1220]"
                >
                  Book Free Demo
                </button>
                <button
                  onClick={handleDismiss}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-white font-medium py-3.5 px-6 rounded-xl transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
                >
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
