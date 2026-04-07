"use client";

import { useSession, signOut } from "next-auth/react";
import { AlertCircle, LogOut, ArrowRight, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function RenewPlanPage() {
    const { data: session } = useSession() as any;

    if (!session) return null;

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-red-500/30">
            {/* Background Glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[100px] animate-pulse" />
            </div>

            <div className="relative w-full max-w-lg">
                <div className="bg-slate-900/40 backdrop-blur-2xl border border-red-500/20 rounded-3xl p-8 shadow-2xl ring-1 ring-white/5 text-center space-y-8">
                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="h-20 w-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center animate-bounce">
                            <ShieldAlert className="h-10 w-10 text-red-500" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                        <h1 className="text-3xl font-black text-white tracking-tight">Subscription Expired</h1>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            Access to your {session.user.hostelId ? "Hostel" : "Pool"} dashboard has been restricted. Please renew your plan to resume operations.
                        </p>
                    </div>

                    {/* Expiry Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">
                        <AlertCircle className="h-4 w-4" />
                        Expired on {new Date(session.user.subscriptionExpiryDate).toLocaleDateString()}
                    </div>

                    {/* Actions */}
                    <div className="grid gap-3 pt-4">
                        <Link
                            href="/select-plan"
                            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition-all shadow-xl shadow-sky-900/20 active:scale-[0.98]"
                        >
                            Extend / Renew Plan <ArrowRight className="h-4 w-4" />
                        </Link>
                        
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold transition-all active:scale-[0.98]"
                        >
                            <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                    </div>

                    {/* Footer */}
                    <p className="text-xs text-slate-500">
                        Need help? Contact support@aquasync.io for assistance.
                    </p>
                </div>
            </div>
        </div>
    );
}
