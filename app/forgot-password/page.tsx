"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, KeyRound, Eye, EyeOff, CheckCircle, ArrowLeft, RefreshCw, Lock } from "lucide-react";

// ── Password strength calculator ──────────────────────────────────────────────
function getPasswordStrength(password: string): {
    score: number; // 0–4
    label: string;
    color: string;
    barColor: string;
} {
    if (!password) return { score: 0, label: "", color: "", barColor: "" };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    // Clamp to 4
    const clamped = Math.min(score, 4);
    const levels = [
        { label: "",           color: "text-slate-500",   barColor: "bg-slate-600" },
        { label: "Weak",       color: "text-red-400",     barColor: "bg-red-500" },
        { label: "Fair",       color: "text-amber-400",   barColor: "bg-amber-500" },
        { label: "Strong",     color: "text-blue-400",    barColor: "bg-blue-500" },
        { label: "Very Strong",color: "text-emerald-400", barColor: "bg-emerald-500" },
    ];

    return { score: clamped, ...levels[clamped] };
}

const RESEND_COOLDOWN = 60; // seconds

// ── Step 1: Email entry ────────────────────────────────────────────────────────
function StepEmail({ onNext }: { onNext: (email: string) => void }) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });

            const data = await res.json();

            if (res.status === 429) {
                setError(data.error || "Too many requests. Please wait before retrying.");
                setLoading(false);
                return;
            }

            // Always show generic success — never reveal if email exists
            setSent(true);
        } catch {
            setError("Network error. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="text-center space-y-4">
                <div className="flex justify-center">
                    <div className="h-14 w-14 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                        <Mail className="h-7 w-7 text-blue-400" />
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Check your inbox</h3>
                    <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                        If an account exists for <span className="text-slate-200 font-medium">{email}</span>, an OTP has been sent. Check your spam folder too.
                    </p>
                </div>
                <button
                    onClick={() => onNext(email.trim().toLowerCase())}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 text-white text-sm font-semibold py-2.5 shadow-lg transition-all mt-2"
                >
                    <KeyRound className="h-4 w-4" />
                    Enter OTP
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}
            <div>
                <label className="block text-xs font-medium text-white/80 uppercase tracking-wider mb-1.5">
                    Registered Email
                </label>
                <input
                    id="fp-email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading}
                    placeholder="Enter your registered email"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                    We&apos;ll only send to the email address on your account.
                </p>
            </div>
            <button
                type="submit"
                id="fp-submit-email"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 active:opacity-80 text-white text-sm font-semibold py-2.5 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {loading ? "Sending…" : "Send OTP"}
            </button>
        </form>
    );
}

// ── Step 2: OTP + new password ─────────────────────────────────────────────────
function StepVerify({ email, onSuccess }: { email: string; onSuccess: () => void }) {
    const [otp, setOtp]               = useState(["", "", "", "", "", ""]);
    const [password, setPassword]     = useState("");
    const [confirm, setConfirm]       = useState("");
    const [showPass, setShowPass]     = useState(false);
    const [error, setError]           = useState("");
    const [loading, setLoading]       = useState(false);
    const [cooldown, setCooldown]     = useState(RESEND_COOLDOWN);
    const [resending, setResending]   = useState(false);
    const [resendDone, setResendDone] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const strength = getPasswordStrength(password);

    // Countdown timer for resend
    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setInterval(() => setCooldown(c => c - 1), 1000);
        return () => clearInterval(t);
    }, [cooldown]);

    const handleOtpChange = (index: number, value: string) => {
        const digit = value.replace(/\D/g, "").slice(-1);
        const next = [...otp];
        next[index] = digit;
        setOtp(next);
        if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (paste) {
            const next = paste.split("").concat(Array(6).fill("")).slice(0, 6);
            setOtp(next);
            inputRefs.current[Math.min(paste.length, 5)]?.focus();
        }
    };

    const handleResend = async () => {
        setResending(true);
        setError("");
        try {
            await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            setResendDone(true);
            setCooldown(RESEND_COOLDOWN);
            setOtp(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
        } catch {
            setError("Failed to resend. Please try again.");
        } finally {
            setResending(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        const otpString = otp.join("");

        if (otpString.length !== 6) {
            setError("Please enter the complete 6-digit OTP.");
            return;
        }
        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/verify-otp-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp: otpString, newPassword: password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Verification failed.");
                setLoading(false);
                return;
            }
            onSuccess();
        } catch {
            setError("Network error. Please try again.");
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}
            {resendDone && (
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 px-4 py-3">
                    <p className="text-sm text-blue-400">A new OTP has been sent to your email. Previous OTP is now invalid.</p>
                </div>
            )}

            {/* OTP Boxes */}
            <div>
                <label className="block text-xs font-medium text-white/80 uppercase tracking-wider mb-3">
                    6-Digit OTP
                </label>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                        <input
                            key={i}
                            ref={el => { inputRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleOtpChange(i, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(i, e)}
                            className={`w-10 h-12 text-center text-lg font-bold rounded-xl border transition
                                ${digit
                                    ? "bg-blue-500/20 border-blue-500/60 text-white"
                                    : "bg-white/5 border-white/10 text-white"
                                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                    ))}
                </div>
                {/* Resend */}
                <div className="flex justify-center mt-3">
                    {cooldown > 0 ? (
                        <p className="text-xs text-slate-500">
                            Resend OTP in <span className="text-slate-300 font-medium">{cooldown}s</span>
                        </p>
                    ) : (
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resending}
                            className="text-xs text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
                        >
                            {resending && <RefreshCw className="h-3 w-3 animate-spin" />}
                            {resending ? "Resending…" : "Resend OTP"}
                        </button>
                    )}
                </div>
            </div>

            {/* New Password */}
            <div>
                <label className="block text-xs font-medium text-white/80 uppercase tracking-wider mb-1.5">
                    New Password
                </label>
                <div className="relative">
                    <input
                        id="fp-new-password"
                        type={showPass ? "text" : "password"}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        disabled={loading}
                        placeholder="Min. 8 characters"
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 pr-10 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                {/* Password strength indicator */}
                {password && (
                    <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.barColor : "bg-white/10"}`} />
                            ))}
                        </div>
                        <p className={`text-xs font-medium ${strength.color}`}>{strength.label}</p>
                    </div>
                )}
            </div>

            {/* Confirm Password */}
            <div>
                <label className="block text-xs font-medium text-white/80 uppercase tracking-wider mb-1.5">
                    Confirm Password
                </label>
                <input
                    id="fp-confirm-password"
                    type="password"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    disabled={loading}
                    placeholder="Re-enter your password"
                    className={`w-full rounded-xl bg-white/5 border px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition ${
                        confirm && confirm !== password ? "border-red-500/60" : "border-white/10"
                    }`}
                />
                {confirm && confirm !== password && (
                    <p className="text-xs text-red-400 mt-1">Passwords do not match.</p>
                )}
            </div>

            <button
                type="submit"
                id="fp-reset-submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 active:opacity-80 text-white text-sm font-semibold py-2.5 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {loading ? "Resetting…" : "Reset Password"}
            </button>
        </form>
    );
}

// ── Step 3: Success ────────────────────────────────────────────────────────────
function StepSuccess() {
    const router = useRouter();
    useEffect(() => {
        const t = setTimeout(() => router.push("/login"), 4000);
        return () => clearTimeout(t);
    }, [router]);

    return (
        <div className="text-center space-y-4">
            <div className="flex justify-center">
                <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle className="h-7 w-7 text-emerald-400" />
                </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold text-white">Password Reset!</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                    Your password has been updated successfully.<br />
                    <span className="text-slate-500">Redirecting to login in a moment…</span>
                </p>
            </div>
            <button
                onClick={() => router.push("/login")}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 text-white text-sm font-semibold py-2.5 shadow-lg transition-all"
            >
                Go to Login
            </button>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<"email" | "verify" | "success">("email");
    const [email, setEmail] = useState("");

    const stepMeta = {
        email:   { title: "Forgot Password?",   subtitle: "Enter your registered email to receive an OTP." },
        verify:  { title: "Verify & Reset",      subtitle: `Enter the OTP sent to ${email || "your email"}.` },
        success: { title: "All Done!",           subtitle: "Your password has been reset." },
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
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-xl mb-4">
                        <ShieldCheck className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">{stepMeta[step].title}</h1>
                    <p className="mt-1 text-sm text-slate-400 text-center">{stepMeta[step].subtitle}</p>
                </div>

                {/* Step indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    {(["email", "verify", "success"] as const).map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full transition-all duration-300 ${
                                step === s
                                    ? "bg-blue-400 scale-125"
                                    : (["email", "verify", "success"].indexOf(step) > i ? "bg-blue-500/50" : "bg-white/10")
                            }`} />
                        </div>
                    ))}
                </div>

                {/* Card */}
                <div className="bg-slate-950/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-6 ring-1 ring-white/5">
                    {step === "email" && (
                        <StepEmail onNext={(e) => { setEmail(e); setStep("verify"); }} />
                    )}
                    {step === "verify" && (
                        <StepVerify email={email} onSuccess={() => setStep("success")} />
                    )}
                    {step === "success" && <StepSuccess />}
                </div>

                {/* Back to login */}
                {step !== "success" && (
                    <div className="flex justify-center mt-5">
                        <button onClick={() => router.push("/login")}
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition">
                            <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
