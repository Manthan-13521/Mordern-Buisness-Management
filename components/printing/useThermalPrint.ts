"use client";

import { useCallback } from "react";
import { printThermalReceipt, MemberReceiptData, PaperWidth, getSavedPaperWidth } from "@/services/thermalPrint.service";

/**
 * React hook for triggering thermal receipt printing.
 * Respects saved paper width preference (58mm/80mm).
 * Usage:
 *   const { print, isSupported } = useThermalPrint();
 *   // After successful member creation:
 *   if (member.plan.hasTokenPrint) print(receiptData);
 */
export function useThermalPrint() {
    const isSupported = typeof window !== "undefined";

    const print = useCallback(
        (data: MemberReceiptData, paperWidth?: PaperWidth) => {
            if (!isSupported) {
                console.warn("[useThermalPrint] Not available in SSR context");
                return;
            }
            printThermalReceipt(data, paperWidth || getSavedPaperWidth());
        },
        [isSupported]
    );

    return { print, isSupported };
}
