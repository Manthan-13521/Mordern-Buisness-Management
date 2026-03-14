"use client";
import { MonitorPlay, Settings, Expand, Video } from "lucide-react";

export default function CctvWidget({ feeds = [] }: { feeds?: { name: string, url: string }[] }) {
    const activeFeeds = feeds.length > 0 ? feeds : [
        { name: "Main Entry Gate", url: "/demo-cctv.png" },
        { name: "Pool Perimeter A", url: "/demo-cctv.png" },
    ];

    return (
        <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl col-span-1 lg:col-span-3 backdrop-blur-xl group hover:border-neutral-700/80 transition-colors">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-bold tracking-widest uppercase text-neutral-400 flex items-center gap-2">
                    <MonitorPlay className="w-4 h-4 text-emerald-400" /> Live Surveillance
                </h3>
                <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-neutral-500 hover:text-white hover:bg-white/10 transition-colors">
                    <Settings className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeFeeds.map((feed, i) => (
                    <div key={i} className="group/cam rounded-2xl overflow-hidden bg-black border border-neutral-800/80 relative aspect-video shadow-lg ring-1 ring-white/5">
                        <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 text-[9px] font-black tracking-widest uppercase text-white z-10 flex items-center gap-2 backdrop-blur-md shadow-sm border border-white/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
                        </div>
                        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 flex items-center justify-between opacity-0 group-hover/cam:opacity-100 transition-all translate-y-2 group-hover/cam:translate-y-0 text-white cursor-pointer">
                            <span className="text-xs font-semibold tracking-wide truncate pr-2">{feed.name}</span>
                            <div className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                                <Expand className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="w-full h-full bg-neutral-950 flex flex-col items-center justify-center text-neutral-600 font-medium text-xs gap-3">
                            <Video className="w-8 h-8 text-neutral-800" />
                            <span className="tracking-widest uppercase text-[9px]">[HLS Stream Live]</span>
                        </div>
                    </div>
                ))}
                
                <div className="rounded-2xl border-2 border-dashed border-neutral-800 hover:border-neutral-600 hover:bg-white/5 transition-all flex items-center justify-center aspect-video cursor-pointer flex-col gap-3 group/add bg-neutral-900/40">
                    <div className="w-10 h-10 rounded-full bg-neutral-800/80 group-hover/add:bg-neutral-700/80 flex items-center justify-center text-neutral-400 group-hover/add:text-white transition-colors border border-neutral-700 group-hover/add:border-neutral-600 shadow-inner">
                        <MonitorPlay className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold tracking-wide text-neutral-500 group-hover/add:text-neutral-300 uppercase transition-colors">Add Camera Feed</span>
                </div>
            </div>
        </div>
    );
}
