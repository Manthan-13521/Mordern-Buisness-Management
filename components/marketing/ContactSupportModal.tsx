"use client";

import { X, Phone, Calendar, MonitorPlay, Settings2, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactSupportModal({ isOpen, onClose }: ContactSupportModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#0b1220] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-[#1f2937] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Gradient */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90 pointer-events-none" />
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors backdrop-blur-md cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 pt-10 px-8 pb-8">
          <div className="w-16 h-16 bg-white dark:bg-[#0b1220] rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-gray-100 dark:border-white/10 mx-auto">
            <Phone className="w-8 h-8 text-blue-600 dark:text-blue-500" />
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Talk to an Expert
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Get free onboarding, setup assistance, or a live product demo tailored to your business.
            </p>
          </div>

          <div className="space-y-4 mb-8 bg-gray-50 dark:bg-black/20 p-5 rounded-2xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Settings2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              Free onboarding & setup assistance
            </div>
            <div className="flex items-center gap-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <MonitorPlay className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              Live personalized product demo
            </div>
            <div className="flex items-center gap-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              Full deployment support
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="tel:+918125629601"
              className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Phone className="w-4 h-4" />
              Call Now
            </a>
            <a
              href="https://wa.me/918125629601?text=Hi%20AquaSync,%20I'm%20interested%20in%20a%20demo/setup%20assistance."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#25D366] hover:bg-[#20bd5a] shadow-lg shadow-[#25D366]/20 active:scale-95 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
          <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-6 font-medium">
            Available Monday-Saturday, 9am - 7pm IST
          </p>
        </div>
      </div>
    </div>
  );
}
