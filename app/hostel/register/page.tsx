"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle, Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";

const INPUT = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";
const LABEL = "block text-xs font-medium text-white/80 uppercase tracking-wider mb-1";

export default function HostelRegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ hostelName: "", city: "", adminEmail: "", adminName: "", password: "", confirmPassword: "", numberOfBlocks: "1" });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState<{ hostelSlug: string; hostelName: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Basic validation
        if (!form.adminEmail.includes("@") || !form.adminEmail.includes(".")) {
            setError("Please enter a valid email address.");
            return;
        }
        if (form.password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/hostel/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hostelName: form.hostelName,
                    city: form.city,
                    adminEmail: form.adminEmail,
                    adminName: form.adminName,
                    password: form.password,
                    numberOfBlocks: Number(form.numberOfBlocks)
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Registration failed");
                setLoading(false);
                return;
            }
            // Auto-login to wipe any existing old session (like from a previous pool login)
            await signIn("credentials", {
                redirect: false,
                username: form.adminEmail,
                password: form.password,
            });

            setSuccess({ hostelSlug: data.hostelSlug, hostelName: data.hostelName });
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
                <div className="flex justify-center"><div className="h-16 w-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg"><CheckCircle className="h-8 w-8 text-white" /></div></div>
                <h1 className="text-2xl font-bold text-white">Registration Complete!</h1>
                <p className="text-slate-300 text-sm"><span className="font-semibold text-white">{success.hostelName}</span> has been registered. Your admin account is ready.</p>
                <button
                    onClick={() => router.push("/select-plan")}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 hover:bg-blue-50 dark:hover:bg-blue-500/100 text-white font-semibold py-3 rounded-xl shadow transition"
                >
                    Continue to Plan Selection →
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-12">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[100px] delay-700" />
            </div>

            <div className="relative w-full max-w-lg">
                <div className="bg-slate-950/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-8 ring-1 ring-white/5">
                    {/* Header */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 flex items-center justify-center shadow-lg shadow-indigo-900/50 mb-4">
                            <Building2 className="h-7 w-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Register Your Hostel</h1>
                        <p className="mt-1 text-sm text-slate-400">Set up your hostel management account in minutes</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className={LABEL}>Hostel Name</label>
                                <input required value={form.hostelName} onChange={e => setForm(p => ({ ...p, hostelName: e.target.value }))} placeholder="Green Valley Hostel" className={INPUT} />
                            </div>
                            <div>
                                <label className={LABEL}>City</label>
                                <input required value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Hyderabad" className={INPUT} />
                            </div>
                            <div>
                                <label className={LABEL}>Number of Blocks</label>
                                <select value={form.numberOfBlocks} onChange={e => setForm(p => ({ ...p, numberOfBlocks: e.target.value }))} className={INPUT}>
                                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} Block{n > 1 ? "s" : ""}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className={LABEL}>Admin Name</label>
                                <input required value={form.adminName} onChange={e => setForm(p => ({ ...p, adminName: e.target.value }))} placeholder="Your full name" className={INPUT} />
                            </div>
                            <div className="col-span-2">
                                <label className={LABEL}>Admin Email</label>
                                <input 
                                    required 
                                    type="email" 
                                    value={form.adminEmail} 
                                    onChange={e => setForm(p => ({ ...p, adminEmail: e.target.value }))} 
                                    placeholder="admin@hostel.com" 
                                    className={`${INPUT} ${error.toLowerCase().includes("email") ? "ring-2 ring-red-500/50 border-red-500/50" : ""}`} 
                                />
                                {error.toLowerCase().includes("email") && (
                                    <p className="mt-1.5 text-[10px] text-red-400 font-medium uppercase tracking-wider">Email Error</p>
                                )}
                            </div>
                            <div>
                                <label className={LABEL}>Password</label>
                                <div className="relative">
                                    <input required type={showPass ? "text" : "password"} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" className={INPUT + " pr-10"} minLength={8} />
                                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200" tabIndex={-1}>
                                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={LABEL}>Confirm Password</label>
                                <input required type={showPass ? "text" : "password"} value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="••••••••" className={INPUT} minLength={8} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 hover:bg-blue-50 dark:hover:bg-blue-500/100 active:bg-indigo-700 text-white text-sm font-semibold py-3 shadow-lg shadow-indigo-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            <Building2 className="h-4 w-4" />
                            {loading ? "Creating Hostel…" : "Create Hostel Account"}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-xs text-slate-600">
                        Already have an account?{" "}
                        <a href="/login" className="text-indigo-400 hover:text-indigo-300">Sign in here</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
