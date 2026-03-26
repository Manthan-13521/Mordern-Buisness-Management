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
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 drop-shadow-sm" />
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-white mb-3">Welcome to the Pool!</h2>
                <p className="text-neutral-400 font-medium">Payment secured and your ID has been successfully generated.</p>
                <button onClick={() => window.location.reload()} className="mt-8 px-6 py-2 rounded-full border border-neutral-700 hover:bg-neutral-800 text-sm font-medium transition-colors">
                    Register Another Member
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="space-y-7">
            <div className="space-y-5">
                <div>
                    <label className="block text-sm font-semibold text-neutral-300 mb-2">Legal Full Name</label>
                    <input name="name" required className="w-full bg-black/40 border border-neutral-800/80 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner" placeholder="John Doe" />
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-semibold text-neutral-300 mb-2">Phone Number</label>
                        <input name="phone" required type="tel" className="w-full bg-black/40 border border-neutral-800/80 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner" placeholder="+91..." />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-neutral-300 mb-2">Age</label>
                        <input name="age" required type="number" className="w-full bg-black/40 border border-neutral-800/80 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner" placeholder="24" />
                    </div>
                </div>
            </div>

            <div className="p-6 rounded-3xl border border-neutral-800/80 bg-neutral-900/40 flex flex-col gap-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] pointer-events-none" />
                <h3 className="text-sm font-bold text-neutral-200 tracking-wide uppercase">Membership Add-ons</h3>
                
                <label className="flex items-center gap-4 cursor-pointer group p-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors">
                    <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all shadow-sm ${isStudent ? 'bg-blue-600 border-blue-500 text-white' : 'border-neutral-700 bg-neutral-900 group-hover:border-neutral-500'}`}>
                        {isStudent && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div>
                        <p className="text-sm font-semibold tracking-wide text-white group-hover:text-blue-400 transition-colors">Swimming Student Plan</p>
                        <p className="text-xs text-neutral-500 mt-0.5 font-medium">Receives student prefix: <span className="font-mono text-neutral-400">MS000X</span></p>
                    </div>
                </label>
            </div>



            <div className="pt-2">
                <button type="submit" disabled={status === "loading"} className="w-full h-14 rounded-2xl bg-white text-black font-bold tracking-wide hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    {status === "loading" ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Proceed to Pay Securely</>}
                </button>
            </div>
        </form>
    );
}
