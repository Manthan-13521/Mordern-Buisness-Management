"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

export function FloatingCTA() {
  const commonClasses = "relative flex items-center justify-center gap-2 rounded-full text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 m-0 group";
  
  const encodedMessage = "Hi%20AquaSync%20Team%2C%20I%27d%20like%20to%20automate%20and%20manage%20my%20business%20using%20AquaSync.%20Could%20you%20guide%20me%20through%20the%20onboarding%20process%2C%20explain%20the%20available%20features%2C%20and%20help%20me%20choose%20the%20right%20plan%20for%20my%20business%3F";

  return (
    <>
      {/* Book Free Demo CTA (Left) */}
      <div className="fixed bottom-6 left-6 z-[80] animate-in slide-in-from-bottom-5 fade-in duration-300">
        <div className="relative">
          <div className="absolute -inset-1 rounded-full bg-blue-500 opacity-20 blur animate-pulse" />
          <Link 
            href="/demo?source=floating_cta"
            className={`${commonClasses} shadow-[0_0_20px_rgba(37,99,235,0.4)] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/30 py-3.5 px-6`}
          >
            <Calendar className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
            <span>Book Free Demo</span>
          </Link>
        </div>
      </div>

      {/* WhatsApp CTA (Right) */}
      <div className="fixed bottom-6 right-6 z-[80] animate-in slide-in-from-bottom-5 fade-in duration-300">
        <div className="relative">
          <div className="absolute -inset-1 rounded-full bg-[#25D366] opacity-20 blur animate-pulse" />
          <a 
            href={`https://wa.me/918125629601?text=${encodedMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            title="Chat on WhatsApp"
            className={`${commonClasses} shadow-[0_0_20px_rgba(37,211,102,0.4)] bg-[#25D366] hover:bg-[#128C7E] border border-[#25D366]/30 py-3.5 px-6`}
          >
            <WhatsAppIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>
      </div>
    </>
  );
}
