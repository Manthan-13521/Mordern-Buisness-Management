"use client";
import { useState } from "react";
import { Trophy, Plus, CalendarDays, Users } from "lucide-react";

export default function RacesManagementPage() {
    const [events] = useState([
        { id: "RACE001", name: "Summer Swim Championship", date: "2026-06-15", status: "Upcoming", participants: 42 },
        { id: "RACE002", name: "City Aquatic Sprint", date: "2026-05-20", status: "Completed", participants: 120 },
    ]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto p-8 lg:p-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4 drop-shadow-sm mb-2">
                        <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 shadow-inner">
                            <Trophy className="w-8 h-8 text-yellow-500" />
                        </div> 
                        Race Management
                    </h1>
                    <p className="text-neutral-400 text-lg">Organize swimming competitions, track lane assignments, and record winners natively in your SaaS.</p>
                </div>
                <div className="flex gap-4">
                    <button className="px-6 py-3.5 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 backdrop-blur-md rounded-2xl font-semibold tracking-wide transition-all border border-neutral-700/80 shadow-sm">
                        View Past Results
                    </button>
                    <button className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold tracking-wide shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-colors flex items-center gap-2 border border-blue-500">
                        <Plus className="w-5 h-5" /> Create Event
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {events.map((evt, i) => (
                     <div key={i} className="bg-neutral-900 border border-neutral-800/80 rounded-[2rem] p-8 relative overflow-hidden group hover:border-neutral-700 transition-colors shadow-2xl backdrop-blur-xl">
                        {evt.status === "Completed" ? (
                            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 blur-[50px] pointer-events-none" />
                        ) : (
                            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 blur-[50px] pointer-events-none" />
                        )}
                        <span className={`inline-block px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl mb-6 shadow-sm border ${evt.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                            {evt.status}
                        </span>
                        
                        <h3 className="text-xl font-bold text-white mb-2 leading-tight tracking-wide">{evt.name}</h3>
                        <p className="text-sm font-mono text-neutral-500 mb-8 font-medium">#{evt.id}</p>
                        
                        <div className="space-y-4 mb-8 p-4 rounded-2xl bg-black/40 border border-neutral-800/50 shadow-inner group-hover:bg-black/60 transition-colors">
                            <div className="flex items-center gap-3 text-sm text-neutral-300 font-semibold tracking-wide">
                                <CalendarDays className="w-4 h-4 text-neutral-500" /> {evt.date}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-300 font-semibold tracking-wide">
                                <Users className="w-4 h-4 text-neutral-500" /> {evt.participants} Swimmers Ranked
                            </div>
                        </div>

                        <button className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-sm font-bold tracking-wide transition-all border border-white/5 shadow-sm">
                            Manage Event Flow
                        </button>
                     </div>
                 ))}
                 
                 <div className="rounded-[2rem] border-2 border-dashed border-neutral-800 bg-neutral-900/30 hover:bg-neutral-900/60 hover:border-neutral-700 transition-all flex items-center justify-center flex-col gap-5 min-h-[350px] cursor-pointer group">
                     <div className="w-14 h-14 rounded-full bg-neutral-800 group-hover:bg-neutral-700 flex items-center justify-center text-neutral-400 border border-neutral-700 transition-colors shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] text-white">
                         <Plus className="w-6 h-6" />
                     </div>
                     <p className="text-sm font-bold tracking-widest uppercase text-neutral-500 group-hover:text-neutral-300 transition-colors">Start New Race</p>
                 </div>
            </div>
        </div>
    );
}
