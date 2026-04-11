"use client";

import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function UnifiedLoginPage() {
    const router = useRouter();
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [error, setError]       = useState("");
    const [loading, setLoading]   = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                redirect: false,
                username: email,
                password,
                isSuperAdmin: "false", // Fixed to false, super admin has their own login page via /superadmin/login
            });

            if (res?.error) {
                setError(res.error);
                setLoading(false);
                return;
            }

            // After successful sign-in, read the session to determine where to redirect
            const session = await getSession();
            const role = (session?.user as any)?.role;

            if (role === "superadmin") {
                router.push("/superadmin/dashboard");
            } else if (role === "hostel_admin") {
                const hostelSlug = (session?.user as any)?.hostelSlug;
                if (hostelSlug) {
                    router.push(`/hostel/${hostelSlug}/admin/dashboard`);
                } else {
                    setError("Hostel not found. Please contact support.");
                    setLoading(false);
                }
            } else if (role === "admin" || role === "operator") {
                const poolSlug = (session?.user as any)?.poolSlug;
                if (poolSlug) {
                    router.push(`/pool/${poolSlug}/admin/dashboard`);
                } else {
                    setError("Pool not found. Please contact support.");
                    setLoading(false);
                }
            } else if (role === "business_admin") {
                const businessSlug = (session?.user as any)?.businessSlug;
                if (businessSlug) {
                    router.push(`/business/${businessSlug}/admin/dashboard`);
                } else {
                    setError("Business not found. Please contact support.");
                    setLoading(false);
                }
            } else {
                router.push("/");
            }
        } catch {
            setError("An unexpected error occurred. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-4 py-12">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[100px] delay-700" />
            </div>

            <div className="relative w-full max-w-sm">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 flex items-center justify-center shadow-xl mb-4 transition-all duration-300">
                        <ShieldCheck className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Sign In</h1>
                    <p className="mt-1 text-sm text-slate-400">Management portal access</p>
                </div>

                {/* Card */}
                <div className="bg-slate-950/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-6 ring-1 ring-white/5">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-white/80 uppercase tracking-wider mb-1.5">
                                Email or Username
                            </label>
                            <input
                                id="login-email"
                                type="text"
                                required
                                autoComplete="username"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                disabled={loading}
                                placeholder="Enter your email or username"
                                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 transition"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-medium text-white/80 uppercase tracking-wider">
                                    Password
                                </label>
                                <a href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                                    Forgot Password?
                                </a>
                            </div>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    type={showPass ? "text" : "password"}
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    disabled={loading}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 pr-10 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    tabIndex={-1}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                                >
                                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            id="login-submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 hover:opacity-90 active:opacity-80 text-white text-sm font-semibold py-2.5 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                        >
                            <Lock className="h-4 w-4" />
                            {loading ? "Signing in…" : "Sign In"}
                        </button>
                    </form>

                    {/* Register links */}
                    <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px] text-slate-500">
                        <span>New account:</span>
                        <a href="/hostel/register" className="text-indigo-400 hover:text-indigo-300 transition">Hostel</a>
                        <span>&middot;</span>
                        <a href="/subscribe" className="text-sky-400 hover:text-sky-300 transition">Pool</a>
                        <span>&middot;</span>
                        <a href="/business/register" className="text-emerald-400 hover:text-emerald-300 font-bold transition">Business</a>
                    </div>
                </div>

                <p className="mt-6 text-center text-[11px] text-slate-600">
                    Management SaaS Platform &copy; {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
