"use client";

import { useCallback } from "react";
import { printThermalReceipt, MemberReceiptData } from "@/services/thermalPrint.service";

/**
 * React hook for triggering thermal receipt printing.
 * Usage:
 *   const { print, isSupported } = useThermalPrint();
 *   // After successful member creation:
 *   if (member.plan.hasTokenPrint) print(receiptData);
 */
export function useThermalPrint() {
    const isSupported = typeof window !== "undefined";

    const print = useCallback(
        (data: MemberReceiptData) => {
            if (!isSupported) {
                console.warn("[useThermalPrint] Not available in SSR context");
                return;
            }
            printThermalReceipt(data);
        },
        [isSupported]
    );

    return { print, isSupported };
}
