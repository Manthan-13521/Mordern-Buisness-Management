"use client";
import React, { useState } from "react";
import Webcam from "react-webcam";
import { Camera, RefreshCw, Send, CheckCircle2 } from "lucide-react";

export default function RegistrationForm({ poolId }: { poolId: string }) {
    const [isStudent, setIsStudent] = useState(false);
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStatus("loading");
        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get("name"),
            phone: formData.get("phone"),
            age: formData.get("age"),
            isStudent,
            poolId
        };
        
        // Mock API Call targeting the specific tenant route
        setTimeout(() => setStatus("success"), 1500);
    };

    if (status === "success") {
        return (
            <div className="text-center py-10 animate-in zoom-in duration-500 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-lg">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-white mb-3">Welcome!</h2>
                <p className="text-slate-400 font-medium max-w-xs mx-auto">Payment secured and your ID has been successfully generated.</p>
                <button onClick={() => window.location.reload()} className="mt-8 px-6 py-2 rounded-xl border border-white/10 hover:bg-white/10 text-sm font-semibold text-white transition-all">
                    Register Another Member
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="space-y-7">
            <div className="space-y-5">
                <div>
                    <label className="block text-xs font-medium text-white/80 uppercase tracking-wider mb-2">Legal Full Name</label>
                    <input name="name" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="John Doe" />
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-xs font-medium text-white/80 uppercase tracking-wider mb-2">Phone Number</label>
                        <input name="phone" required type="tel" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="+91..." />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-white/80 uppercase tracking-wider mb-2">Age</label>
                        <input name="age" required type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="24" />
                    </div>
                </div>
            </div>

            <div className="p-6 rounded-3xl border border-white/10 bg-white/5 flex flex-col gap-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] pointer-events-none" />
                <h3 className="text-xs font-bold text-white/50 tracking-widest uppercase">Membership Add-ons</h3>
                
                <label className="flex items-center gap-4 cursor-pointer group p-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors">
                    <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all shadow-sm ${isStudent ? 'bg-blue-600 border-blue-500 text-white' : 'border-white/10 bg-white/5 group-hover:border-white/30'}`}>
                        {isStudent && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div>
                        <p className="text-sm font-semibold tracking-wide text-white group-hover:text-blue-400 transition-colors">Swimming Student Plan</p>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">Receives student prefix: <span className="font-mono text-slate-400">MS000X</span></p>
                    </div>
                </label>
            </div>



            <div className="pt-2">
                <button type="submit" disabled={status === "loading"} className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold tracking-wide hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-900/20">
                    {status === "loading" ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Proceed to Pay Securely</>}
                </button>
            </div>
        </form>
    );
}
