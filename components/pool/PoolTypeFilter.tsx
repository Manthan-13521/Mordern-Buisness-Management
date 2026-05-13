"use client";

import { usePoolType } from "./PoolTypeContext";
import { Users2 } from "lucide-react";

export function PoolTypeFilter() {
    const { selectedType, setSelectedType } = usePoolType();

    return (
        <div className="flex items-center gap-2">
            <div className="relative flex items-center">
                <Users2 className="absolute left-3 h-4 w-4 text-sky-400 pointer-events-none" />
                <select
                    id="pool-type-filter"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="appearance-none text-sm font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-[#0b1220] text-slate-800 dark:text-slate-100 pl-9 pr-8 py-2 min-w-[150px] focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors cursor-pointer shadow-sm"
                    aria-label="Filter by Member Type"
                >
                    <option value="all">All Types</option>
                    <option value="member">Members</option>
                    <option value="entertainment">Entertainment</option>
                </select>
                <div className="absolute right-3 pointer-events-none text-slate-400 text-xs">▼</div>
            </div>
            {selectedType !== "all" && (
                <button
                    onClick={() => setSelectedType("all")}
                    title="Clear filter"
                    className="h-8 w-8 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center hover:bg-sky-200 dark:hover:bg-sky-800/60 transition-colors text-sm font-black flex-shrink-0"
                >
                    ×
                </button>
            )}
        </div>
    );
}
