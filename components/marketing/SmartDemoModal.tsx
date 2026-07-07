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

  if (session || isExcluded) return null;

  return (
    <>

      {isVisible && (
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
                  onClick={handleDismiss}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-white font-medium py-3.5 px-6 rounded-xl transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
                >
                  Not Now
                </button>
                <button
                  onClick={handleBookDemo}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/30 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[#0b1220]"
                >
                  Book Free Demo
                </button>
                <a
                  href="https://wa.me/918126296001?text=Hi%20AquaSync%20Team%2C%20I%27d%20like%20to%20automate%20and%20manage%20my%20business%20using%20AquaSync.%20Could%20you%20guide%20me%20through%20the%20onboarding%20process%2C%20explain%20the%20available%20features%2C%20and%20help%20me%20choose%20the%20right%20plan%20for%20my%20business%3F"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-[#25D366]/30 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 dark:focus:ring-offset-[#0b1220]"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </>
  );
}
