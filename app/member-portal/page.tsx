"use client";
import { User, Activity, Trophy, Clock, QrCode } from "lucide-react";

export const dynamic = "force-dynamic";

export default function MemberPortalDashboard() {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pt-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-10 border-b border-neutral-800/80">
                <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-neutral-800 to-black border border-neutral-700/80 flex items-center justify-center text-4xl font-bold text-neutral-400 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                        <User className="w-10 h-10 text-white shrink-0 drop-shadow" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-white mb-2 drop-shadow-sm">Welcome back, John</h1>
                        <p className="text-neutral-400 font-medium text-lg">Membership ID: <span className="text-blue-400 font-mono tracking-wider ml-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">POOL-M0042</span></p>
                    </div>
                </div>
                <button className="mt-8 md:mt-0 px-8 py-4 bg-white text-black font-bold tracking-wide rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:bg-neutral-200 transition-all hover:scale-[1.02] flex items-center gap-3">
                    <QrCode className="w-5 h-5 shrink-0" /> Open Scanner ID
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 rounded-[2rem] bg-neutral-900 border border-neutral-800/80 shadow-2xl relative overflow-hidden group hover:border-neutral-700/80 transition-colors">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 blur-[50px] pointer-events-none" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-8 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" /> Plan Status
                    </h3>
                    <p className="text-5xl font-black text-white mb-3">Active</p>
                    <p className="text-sm font-semibold text-emerald-400 px-3 py-1.5 inline-block rounded-lg bg-emerald-500/10 border border-emerald-500/20">Pro Plan • Expires in 24 days</p>
                </div>
                
                <div className="p-8 rounded-[2rem] bg-neutral-900 border border-neutral-800/80 shadow-2xl relative overflow-hidden group hover:border-neutral-700/80 transition-colors">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 blur-[50px] pointer-events-none" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-8 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400" /> Total Swims
                    </h3>
                    <p className="text-5xl font-black text-white mb-3">142</p>
                    <p className="text-sm font-semibold text-neutral-400">This Month: <span className="text-blue-400">12 entries logged</span></p>
                </div>

                <div className="p-8 rounded-[2rem] bg-neutral-900 border border-neutral-800/80 shadow-2xl relative overflow-hidden group hover:border-neutral-700/80 transition-colors">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/10 blur-[50px] pointer-events-none" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-8 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" /> Race Wins
                    </h3>
                    <p className="text-5xl font-black text-white mb-3">3</p>
                    <p className="text-sm font-semibold text-yellow-500">Last Medal: City Sprint (1st Place)</p>
                </div>
            </div>

            <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-[2rem] p-8 lg:p-10 backdrop-blur-xl shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-8 tracking-wide">Recent Entry Log Ledger</h2>
                <div className="space-y-4">
                    {[1, 2, 3].map((_, i) => (
                        <div key={i} className="flex justify-between items-center p-5 rounded-2xl bg-black/40 border border-neutral-800/80 hover:bg-black/60 transition-all cursor-pointer shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] hover:border-neutral-700">
                            <div>
                                <p className="font-bold text-white tracking-wide">Entry Permitted</p>
                                <p className="text-xs text-neutral-500 mt-1 font-semibold">Verified automatically via Face Scan</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-emerald-400 tracking-wide uppercase">Today</p>
                                <p className="text-xs text-neutral-500 font-mono mt-1 font-medium">08:15:23 AM</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
