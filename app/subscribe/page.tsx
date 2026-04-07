"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Waves, Eye, EyeOff, CheckCircle, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

const INPUT = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition";
const LABEL = "block text-xs font-medium text-white/80 uppercase tracking-wider mb-1";

function PoolRegisterForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const plan = searchParams.get("plan") || "starter";

    const [form, setForm] = useState({
        poolName: "",
        city: "",
        adminName: "",
        adminEmail: "",
        password: "",
        confirmPassword: "",
        adminPhone: "",
    });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState<{ poolSlug: string; poolName: string; rawPassword?: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Client-side validation
            if (!form.adminEmail.includes("@") || !form.adminEmail.includes(".")) {
                setError("Please enter a valid email address.");
                setLoading(false);
                return;
            }
            if (form.password.length < 8) {
                setError("Password must be at least 8 characters long.");
                setLoading(false);
                return;
            }

            const res = await fetch("/api/pool/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    poolName: form.poolName,
                    city: form.city,
                    adminEmail: form.adminEmail,
                    adminName: form.adminName,
                    adminPhone: form.adminPhone,
                    password: form.password,
                    plan,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Registration failed. Please try again.");
                setLoading(false);
                return;
            }

            // Support both old (rawPassword in root) and new response shapes
            setSuccess({
                poolSlug: data.pool?.slug || data.poolSlug,
                poolName: data.pool?.poolName || data.poolName,
                rawPassword: data.rawPassword,
            });
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 px-4">
                <div className="relative w-full max-w-sm">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center space-y-5">
                        <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg">
                                <CheckCircle className="h-8 w-8 text-white" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Pool Registered!</h1>
                        <p className="text-slate-300 text-sm">
                            <span className="font-semibold text-white">{success.poolName}</span> is ready. Save your credentials below.
                        </p>

                        {success.rawPassword && (
                            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-left">
                                <p className="text-xs text-amber-400 font-medium mb-1 uppercase tracking-wider">Admin Password (save this!)</p>
                                <p className="font-mono text-lg font-bold text-amber-300">{success.rawPassword}</p>
                                <p className="text-xs text-amber-500 mt-1">This will not be shown again.</p>
                            </div>
                        )}

                        <div className="space-y-2 pt-2">
                            <button
                                onClick={() => router.push("/select-plan")}
                                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 rounded-xl shadow transition"
                            >
                                Continue to Plan Selection →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 px-4 py-12">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-600/20 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-[100px] delay-700" />
            </div>

            <div className="relative w-full max-w-lg">
                <div className="bg-slate-950/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-8 ring-1 ring-white/5">
                    {/* Header */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="h-14 w-14 rounded-2xl bg-sky-600 flex items-center justify-center shadow-lg shadow-sky-900/50 mb-4">
                            <Waves className="h-7 w-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Register Your Pool</h1>
                        <p className="mt-1 text-sm text-slate-400">
                            Set up your swimming pool management system
                            {plan !== "starter" && (
                                <span className="ml-1 text-sky-400 font-medium">· {plan.toUpperCase()} plan</span>
                            )}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className={LABEL}>Pool Name</label>
                                <input
                                    required
                                    value={form.poolName}
                                    onChange={e => setForm(p => ({ ...p, poolName: e.target.value }))}
                                    placeholder="Blue Waves Aquatic Center"
                                    className={INPUT}
                                />
                            </div>
                            <div>
                                <label className={LABEL}>City</label>
                                <input
                                    required
                                    value={form.city}
                                    onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                                    placeholder="Hyderabad"
                                    className={INPUT}
                                />
                            </div>
                            <div>
                                <label className={LABEL}>Admin Phone</label>
                                <input
                                    value={form.adminPhone}
                                    onChange={e => setForm(p => ({ ...p, adminPhone: e.target.value }))}
                                    placeholder="9876543210"
                                    className={INPUT}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className={LABEL}>Admin Name</label>
                                <input
                                    required
                                    value={form.adminName}
                                    onChange={e => setForm(p => ({ ...p, adminName: e.target.value }))}
                                    placeholder="Your full name"
                                    className={INPUT}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className={LABEL}>Admin Email</label>
                                <input
                                    required
                                    type="email"
                                    value={form.adminEmail}
                                    onChange={e => setForm(p => ({ ...p, adminEmail: e.target.value }))}
                                    placeholder="admin@bluewaves.com"
                                    className={`${INPUT} ${error.toLowerCase().includes("email") ? "ring-2 ring-red-500/50 border-red-500/50" : ""}`} 
                                />
                                {error.toLowerCase().includes("email") && (
                                    <p className="mt-1.5 text-[10px] text-red-400 font-medium uppercase tracking-wider">Email Error</p>
                                )}
                            </div>
                            <div>
                                <label className={LABEL}>Password</label>
                                <div className="relative">
                                    <input
                                        required
                                        type={showPass ? "text" : "password"}
                                        value={form.password}
                                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                        placeholder="••••••••"
                                        minLength={8}
                                        className={INPUT + " pr-10"}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        tabIndex={-1}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                                    >
                                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={LABEL}>Confirm Password</label>
                                <input
                                    required
                                    type={showPass ? "text" : "password"}
                                    value={form.confirmPassword}
                                    onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                    placeholder="••••••••"
                                    minLength={8}
                                    className={INPUT}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 hover:bg-blue-50 dark:hover:bg-blue-500/100 active:bg-indigo-700 text-white text-sm font-semibold py-3 shadow-lg shadow-sky-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Waves className="h-4 w-4" />}
                            {loading ? "Creating Pool…" : "Create Pool Account"}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-xs text-slate-600">
                        Already have an account?{" "}
                        <a href="/login" className="text-sky-400 hover:text-sky-300 transition">
                            Sign in here
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function SubscribePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
        }>
            <PoolRegisterForm />
        </Suspense>
    );
}
