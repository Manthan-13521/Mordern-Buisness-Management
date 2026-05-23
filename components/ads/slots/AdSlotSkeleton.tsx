"use client";

import { memo } from "react";
import { AdSlotName, SLOT_CONSTRAINTS } from "@/lib/ad-slots";

export const AdSlotSkeleton = memo(function AdSlotSkeleton({ slotName, className = "" }: { slotName: AdSlotName, className?: string }) {
    const constraints = SLOT_CONSTRAINTS[slotName];
    
    return (
        <div 
            className={`w-full rounded-2xl bg-[#0f172a] border border-[#1e293b] flex flex-col overflow-hidden animate-pulse ${className}`}
            style={{ minHeight: `${constraints.minHeight}px` }}
        >
            <div className="flex-1 bg-[#1e293b]/50"></div>
            {constraints.designMode !== "minimal" && (
                <div className="p-4 flex justify-between items-end border-t border-[#1e293b]">
                    <div className="space-y-2 w-3/4">
                        <div className="h-4 bg-[#334155] rounded w-full"></div>
                        <div className="h-3 bg-[#334155] rounded w-2/3"></div>
                    </div>
                    <div className="h-8 w-20 bg-[#334155] rounded-lg"></div>
                </div>
            )}
        </div>
    );
});
