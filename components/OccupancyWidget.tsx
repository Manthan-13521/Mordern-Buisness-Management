"use client";
import { Users, AlertTriangle } from "lucide-react";

export default function OccupancyWidget({ capacity = 100, current = 42 }: { capacity?: number; current?: number }) {
    const percentage = Math.min((current / capacity) * 100, 100);
    const colorClass = percentage >= 90 ? "bg-red-500" : percentage > 75 ? "bg-amber-500" : "bg-emerald-500";
    
    return (
        <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-3xl p-6 relative overflow-hidden shadow-xl backdrop-blur-xl group hover:border-neutral-700/80 transition-colors">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 blur-[60px] pointer-events-none" />
            <h3 className="text-[11px] font-bold tracking-widest uppercase text-neutral-400 flex items-center gap-2 mb-6">
                <Users className="w-3.5 h-3.5 text-blue-400" /> Live Occupancy
            </h3>
            
            <div className="flex items-end gap-3 truncate mb-8 relative z-10">
                <span className="text-6xl font-black tracking-tight text-white drop-shadow-sm leading-none">{current}</span>
                <span className="text-sm font-medium text-neutral-500 mb-1.5 flex flex-col justify-end">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-0.5">Capacity</span>
                    / {capacity} Active
                </span>
            </div>

            <div className="space-y-2 relative z-10">
                <div className="flex justify-between text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
                    <span>Usage Status</span>
                    <span className={percentage >= 90 ? 'text-red-400' : ''}>{percentage.toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-neutral-800/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]">
                    <div className={`h-full ${colorClass} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }} />
                </div>
            </div>
            
            {percentage >= 90 && (
                <div className="mt-5 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Smart Crowd Control Active. Entries Paused.</span>
                </div>
            )}
        </div>
    );
}
