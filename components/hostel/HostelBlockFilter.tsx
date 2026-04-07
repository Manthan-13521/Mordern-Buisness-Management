"use client";

import { useHostelBlock } from "./HostelBlockContext";
import { Layers } from "lucide-react";

export function HostelBlockFilter() {
    const { selectedBlock, setSelectedBlock, blocks, blocksLoading } = useHostelBlock();

    if (blocksLoading && blocks.length === 0) return null;

    return (
        <div className="flex items-center gap-2">
            <div className="relative flex items-center">
                <Layers className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                    id="page-block-filter"
                    value={selectedBlock}
                    onChange={(e) => setSelectedBlock(e.target.value)}
                    disabled={blocksLoading}
                    className="appearance-none text-sm font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 pl-9 pr-8 py-2 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                    aria-label="Filter by block"
                >
                    <option value="all">All Blocks</option>
                    {blocks.map((b) => (
                        <option key={b} value={b}>
                            Block {b}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 pointer-events-none text-slate-400 text-xs">▼</div>
            </div>
            {selectedBlock !== "all" && (
                <button
                    onClick={() => setSelectedBlock("all")}
                    title="Clear block filter"
                    className="h-8 w-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors text-sm font-black flex-shrink-0"
                >
                    ×
                </button>
            )}
        </div>
    );
}
