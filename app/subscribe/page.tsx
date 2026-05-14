"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Waves, Eye, EyeOff, CheckCircle, Loader2, CreditCard, Banknote, Smartphone, Receipt, ArrowLeft, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";

export const dynamic = "force-dynamic";

const INPUT = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition";
const LABEL = "block text-xs font-medium text-white/80 uppercase tracking-wider mb-1";

const POOL_PLANS = [
    { id: "trial", name: "Trial", price: 2, duration: "7 days" },
    { id: "quarterly", name: "Quarterly", price: 2999, duration: "90 days" },
    { id: "yearly", name: "Yearly", price: 7999, duration: "365 days" },
];

const PAYMENT_MODES = [
    { id: "razorpay", name: "Razorpay", icon: CreditCard, color: "text-blue-400 border-blue-500/20 bg-blue-500/10" },
    { id: "upi", name: "UPI", icon: Smartphone, color: "text-purple-400 border-purple-500/20 bg-purple-500/10" },
    { id: "cash", name: "Cash", icon: Banknote, color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" },
];

function PoolRegisterForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const plan = searchParams.get("plan") || "starter";
    const isAdminMode = searchParams.get("admin") === "true";

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

    // Admin billing step state
    const [showBillingStep, setShowBillingStep] = useState(false);
    const [billing, setBilling] = useState({
        payerName: "",
        remarks: "",
        planType: "quarterly",
        paymentMode: "upi",
    });

    const selectedPlan = POOL_PLANS.find(p => p.id === billing.planType) || POOL_PLANS[1];

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Client-side validation
        if (!form.adminEmail.includes("@") || !form.adminEmail.includes(".")) {
            setError("Please enter a valid email address.");
            return;
        }
        if (form.password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        // Admin mode: show billing step instead of submitting
        if (isAdminMode) {
            setShowBillingStep(true);
            return;
        }

        // Public mode: submit directly (unchanged)
        await submitRegistration();
    };

    const submitRegistration = async (billingData?: typeof billing) => {
        setLoading(true);
        setError("");

        try {
            const payload: any = {
                poolName: form.poolName,
                city: form.city,
                adminEmail: form.adminEmail,
                adminName: form.adminName,
                adminPhone: form.adminPhone,
                password: form.password,
                plan,
            };

            // Attach admin billing if present
            if (billingData) {
                const planInfo = POOL_PLANS.find(p => p.id === billingData.planType) || POOL_PLANS[1];
                payload.adminBilling = {
                    payerName: billingData.payerName || "SuperAdmin",
                    remarks: billingData.remarks,
                    planType: billingData.planType,
                    amount: planInfo.price,
                    paymentMode: billingData.paymentMode,
                    duration: planInfo.duration,
                };
            }

            const res = await fetch("/api/pool/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Registration failed. Please try again.");
                setLoading(false);
                return;
            }

            if (!isAdminMode) {
                // Auto-login to wipe any existing old session (like from a previous hostel login)
                await signIn("credentials", {
                    redirect: false,
                    username: form.adminEmail,
                    password: form.password,
                });
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

    const handleAdminConfirm = async () => {
        await submitRegistration(billing);
    };

    // ── SUCCESS SCREEN ──────────────────────────────────────────────────────
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
                            {isAdminMode ? (
                                <button
                                    onClick={() => router.push("/superadmin/pools")}
                                    className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-3 rounded-xl shadow transition"
                                >
                                    ← Back to Pool Management
                                </button>
                            ) : (
                                <button
                                    onClick={() => router.push("/select-plan")}
                                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 rounded-xl shadow transition"
                                >
                                    Continue to Plan Selection →
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── ADMIN BILLING CONFIRMATION STEP ──────────────────────────────────────
    if (showBillingStep && isAdminMode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020617] px-4 py-12">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#8b5cf6]/10 rounded-full blur-[120px]" />
                </div>

                <div className="relative w-full max-w-2xl space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowBillingStep(false)} className="p-2 rounded-xl border border-[#1f2937] hover:bg-[#0b1220] transition-all">
                            <ArrowLeft className="h-5 w-5 text-[#9ca3af]" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-[#f9fafb] flex items-center gap-2">
                                <Receipt className="h-6 w-6 text-[#8b5cf6]" />
                                Internal Billing Confirmation
                            </h1>
                            <p className="text-sm text-[#6b7280]">Complete billing details for <span className="text-[#f9fafb] font-semibold">{form.poolName}</span></p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* LEFT: Form Fields */}
                        <div className="lg:col-span-3 space-y-5">
                            {/* Payer Details */}
                            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] p-5 space-y-4">
                                <h3 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Payer Details</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-[#9ca3af] mb-1.5 uppercase tracking-wider">Payer Name</label>
                                        <input
                                            value={billing.payerName}
                                            onChange={e => setBilling(b => ({ ...b, payerName: e.target.value }))}
                                            placeholder="Name of person paying"
                                            className="w-full rounded-xl border border-[#1f2937] bg-[#020617] px-4 py-2.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[#9ca3af] mb-1.5 uppercase tracking-wider">Remarks (Optional)</label>
                                        <input
                                            value={billing.remarks}
                                            onChange={e => setBilling(b => ({ ...b, remarks: e.target.value }))}
                                            placeholder="Any notes about this activation"
                                            className="w-full rounded-xl border border-[#1f2937] bg-[#020617] px-4 py-2.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Plan Selection */}
                            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] p-5 space-y-4">
                                <h3 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Select Plan</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {POOL_PLANS.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setBilling(b => ({ ...b, planType: p.id }))}
                                            className={`rounded-xl border p-4 text-center transition-all ${
                                                billing.planType === p.id
                                                    ? "border-[#8b5cf6] bg-[#8b5cf6]/10 ring-1 ring-[#8b5cf6]"
                                                    : "border-[#1f2937] bg-[#020617] hover:border-[#8b5cf6]/30"
                                            }`}
                                        >
                                            <p className="text-sm font-bold text-[#f9fafb]">{p.name}</p>
                                            <p className="text-lg font-black text-[#8b5cf6] mt-1">₹{p.price.toLocaleString("en-IN")}</p>
                                            <p className="text-[10px] text-[#6b7280] font-medium uppercase tracking-wider mt-1">{p.duration}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Mode */}
                            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] p-5 space-y-4">
                                <h3 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Payment Mode</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {PAYMENT_MODES.map(m => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setBilling(b => ({ ...b, paymentMode: m.id }))}
                                            className={`rounded-xl border p-4 flex flex-col items-center gap-2 transition-all ${
                                                billing.paymentMode === m.id
                                                    ? "border-[#8b5cf6] bg-[#8b5cf6]/10 ring-1 ring-[#8b5cf6]"
                                                    : "border-[#1f2937] bg-[#020617] hover:border-[#8b5cf6]/30"
                                            }`}
                                        >
                                            <m.icon className={`h-5 w-5 ${billing.paymentMode === m.id ? "text-[#8b5cf6]" : "text-[#9ca3af]"}`} />
                                            <span className="text-sm font-bold text-[#f9fafb]">{m.name}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-[#6b7280] italic">This is for record-keeping only. No payment gateway will be triggered.</p>
                            </div>
                        </div>

                        {/* RIGHT: Billing Summary */}
                        <div className="lg:col-span-2 space-y-5">
                            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] p-5 space-y-4 sticky top-6">
                                <h3 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-[#8b5cf6]" />
                                    Billing Summary
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between py-2 border-b border-[#1f2937]">
                                        <span className="text-[#6b7280]">Module</span>
                                        <span className="text-[#f9fafb] font-bold flex items-center gap-1.5"><Waves className="h-3.5 w-3.5 text-sky-400" /> Pool</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-[#1f2937]">
                                        <span className="text-[#6b7280]">Plan</span>
                                        <span className="text-[#f9fafb] font-bold">{selectedPlan.name}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-[#1f2937]">
                                        <span className="text-[#6b7280]">Duration</span>
                                        <span className="text-[#f9fafb] font-medium">{selectedPlan.duration}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-[#1f2937]">
                                        <span className="text-[#6b7280]">Payment</span>
                                        <span className="text-[#f9fafb] font-medium capitalize">{billing.paymentMode}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-[#1f2937]">
                                        <span className="text-[#6b7280]">Payer</span>
                                        <span className="text-[#f9fafb] font-medium truncate ml-2">{billing.payerName || "—"}</span>
                                    </div>
                                    <div className="flex justify-between py-3 mt-2 rounded-xl bg-[#8b5cf6]/10 px-3">
                                        <span className="text-[#8b5cf6] font-bold">Total</span>
                                        <span className="text-[#8b5cf6] font-black text-lg">₹{selectedPlan.price.toLocaleString("en-IN")}</span>
                                    </div>
                                </div>

                                {error && (
                                    <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3">
                                        <p className="text-sm text-rose-400">{error}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleAdminConfirm}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#8b5cf6]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                    {loading ? "Creating Account…" : "Confirm & Create"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── REGISTRATION FORM (unchanged for public, same for admin step 1) ──────
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 px-4 py-12">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-600/20 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-[100px] delay-700" />
            </div>

            <div className="relative w-full max-w-lg">
                <div className="bg-slate-950/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-8 ring-1 ring-white/5">
                    {/* Admin mode badge */}
                    {isAdminMode && (
                        <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20">
                            <ShieldCheck className="h-4 w-4 text-[#8b5cf6]" />
                            <span className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wider">Super Admin Mode</span>
                        </div>
                    )}

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

                    <form onSubmit={handleFormSubmit} className="space-y-4">
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
                            {isAdminMode
                                ? "Continue to Billing →"
                                : loading ? "Creating Pool…" : "Create Pool Account"
                            }
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
