"use client";

import { useState, useRef, useEffect } from "react";
import { Printer, X, ExternalLink, Smartphone, Monitor } from "lucide-react";

/**
 * Lightweight "Printer Apps / Print Help" dropdown.
 * Place near the Print Receipt / Reprint Token button.
 * Shows download links for Android (RawBT), iOS (Epson), and Windows guidance.
 */
export function PrinterAppsHelp() {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <button
                onClick={() => setOpen(!open)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-400 hover:text-teal-400 hover:bg-teal-500/10 border border-transparent hover:border-teal-500/20 transition-all"
                title="Printer setup help"
            >
                <Printer className="h-3 w-3" />
                Print Help
            </button>

            {open && (
                <div
                    className="fixed inset-x-0 bottom-0 z-50 sm:absolute sm:inset-auto sm:right-0 sm:bottom-auto sm:top-full sm:mt-1.5 sm:w-72"
                    style={{ maxHeight: "85vh" }}
                >
                    {/* Mobile: full-width bottom sheet / Desktop: positioned dropdown */}
                    <div className="rounded-t-2xl sm:rounded-xl border border-white/10 bg-slate-900 shadow-2xl ring-1 ring-black/20 overflow-y-auto max-h-[85vh] sm:max-h-none">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/5 sticky top-0">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Printer className="h-3.5 w-3.5 text-teal-400" />
                                Thermal Printer Setup
                            </span>
                            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="p-3 space-y-3">
                            {/* Android */}
                            <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Smartphone className="h-3 w-3 text-green-400" />
                                    <span className="text-[11px] font-bold text-white">Android</span>
                                </div>
                                <a
                                    href="https://play.google.com/store/apps/details?id=ru.a402.rawbtprinter"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between w-full rounded-lg bg-teal-500/10 border border-teal-500/20 px-3 py-2.5 text-xs font-medium text-teal-400 hover:bg-teal-500/20 transition-all active:scale-[0.98] group"
                                >
                                    <span>Download RawBT App</span>
                                    <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                                </a>
                                <p className="mt-1 text-[10px] text-gray-500 leading-tight">
                                    Install → pair Bluetooth printer → enable as default print service.
                                </p>
                            </div>

                            {/* iOS */}
                            <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Smartphone className="h-3 w-3 text-blue-400" />
                                    <span className="text-[11px] font-bold text-white">iPhone / iPad</span>
                                </div>
                                <a
                                    href="https://apps.apple.com/app/epson-smart-panel/id1192019456"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between w-full rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-all active:scale-[0.98] group"
                                >
                                    <span>Download Epson Smart Panel</span>
                                    <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                                </a>
                                <p className="mt-1 text-[10px] text-gray-500 leading-tight">
                                    Works with AirPrint-compatible and Epson thermal printers. On iOS, use the Share → Print option from Safari.
                                </p>
                            </div>

                            {/* Windows */}
                            <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Monitor className="h-3 w-3 text-purple-400" />
                                    <span className="text-[11px] font-bold text-white">Windows</span>
                                </div>
                                <p className="text-[10px] text-gray-400 leading-tight">
                                    Install your printer driver, then use browser <span className="text-white font-medium">Ctrl+P</span> or click the print button. Select your thermal printer from the dialog.
                                </p>
                            </div>

                            {/* Paper width tip */}
                            <div className="pt-2 border-t border-white/5">
                                <p className="text-[10px] text-gray-500">
                                    💡 Set paper width (58mm/80mm) in <span className="text-gray-300">Settings → Printing Settings</span> for optimal alignment.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
