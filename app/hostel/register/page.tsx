"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Building2, CheckCircle, Eye, EyeOff, Loader2, CreditCard, Banknote, Smartphone, Receipt, ArrowLeft, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";

const INPUT = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";
const LABEL = "block text-xs font-medium text-white/80 uppercase tracking-wider mb-1";

const HOSTEL_PLANS = [
    { id: "1-block", name: "1 Block", price: 5999, duration: "1 year", blocks: 1 },
    { id: "2-block", name: "2 Blocks", price: 9999, duration: "1 year", blocks: 2 },
    { id: "3-block", name: "3 Blocks", price: 12999, duration: "1 year", blocks: 3 },
    { id: "4-block", name: "4 Blocks", price: 14999, duration: "1 year", blocks: 4 },
];

const PAYMENT_MODES = [
    { id: "razorpay", name: "Razorpay", icon: CreditCard, color: "text-blue-400" },
    { id: "upi", name: "UPI", icon: Smartphone, color: "text-purple-400" },
    { id: "cash", name: "Cash", icon: Banknote, color: "text-emerald-400" },
];

function HostelRegisterInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const isAdminMode = searchParams.get("admin") === "true";

    const [form, setForm] = useState({ hostelName: "", city: "", adminEmail: "", adminName: "", password: "", confirmPassword: "", numberOfBlocks: "1" });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState<{ hostelSlug: string; hostelName: string } | null>(null);

    // Admin billing step state
    const [showBillingStep, setShowBillingStep] = useState(false);
    const [billing, setBilling] = useState({
        payerName: "",
        remarks: "",
        planType: "1-block",
        paymentMode: "upi",
    });

    const selectedPlan = HOSTEL_PLANS.find(p => p.id === billing.planType) || HOSTEL_PLANS[0];

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

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

        if (isAdminMode) {
            // Auto-select plan based on blocks
            const blockCount = Number(form.numberOfBlocks);
            const matchedPlan = HOSTEL_PLANS.find(p => p.blocks === blockCount);
            if (matchedPlan) setBilling(b => ({ ...b, planType: matchedPlan.id }));
            setShowBillingStep(true);
            return;
        }

        await submitRegistration();
    };

    const submitRegistration = async (billingData?: typeof billing) => {
        setLoading(true);
        setError("");

        try {
            const payload: any = {
                hostelName: form.hostelName,
                city: form.city,
                adminEmail: form.adminEmail,
                adminName: form.adminName,
                password: form.password,
                numberOfBlocks: Number(form.numberOfBlocks),
            };

            if (billingData) {
                const planInfo = HOSTEL_PLANS.find(p => p.id === billingData.planType) || HOSTEL_PLANS[0];
                payload.adminBilling = {
                    payerName: billingData.payerName || "SuperAdmin",
                    remarks: billingData.remarks,
                    planType: billingData.planType,
                    amount: planInfo.price,
                    paymentMode: billingData.paymentMode,
                    duration: planInfo.duration,
                };
            }

            const res = await fetch("/api/hostel/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Registration failed");
                setLoading(false);
                return;
            }

            if (!isAdminMode) {
                await signIn("credentials", {
                    redirect: false,
                    username: form.adminEmail,
                    password: form.password,
                });
            }

            setSuccess({ hostelSlug: data.hostelSlug, hostelName: data.hostelName });
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleAdminConfirm = async () => {
        await submitRegistration(billing);
    };

    // ── SUCCESS SCREEN ──────────────────────────────────────────────────────
    if (success) return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
                <div className="flex justify-center"><div className="h-16 w-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg"><CheckCircle className="h-8 w-8 text-white" /></div></div>
                <h1 className="text-2xl font-bold text-white">Registration Complete!</h1>
                <p className="text-slate-300 text-sm"><span className="font-semibold text-white">{success.hostelName}</span> has been registered. Your admin account is ready.</p>
                {isAdminMode ? (
                    <button
                        onClick={() => router.push("/superadmin/hostels")}
                        className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 text-white font-semibold py-3 rounded-xl shadow transition"
                    >
                        ← Back to Hostel Management
                    </button>
                ) : (
                    <button
                        onClick={() => router.push("/select-plan")}
                        className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 text-white font-semibold py-3 rounded-xl shadow transition"
                    >
                        Continue to Plan Selection →
                    </button>
                )}
            </div>
        </div>
    );

    // ── ADMIN BILLING CONFIRMATION STEP ──────────────────────────────────────
    if (showBillingStep && isAdminMode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020617] px-4 py-12">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#8b5cf6]/10 rounded-full blur-[120px]" />
                </div>

                <div className="relative w-full max-w-2xl space-y-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowBillingStep(false)} className="p-2 rounded-xl border border-[#1f2937] hover:bg-[#0b1220] transition-all">
                            <ArrowLeft className="h-5 w-5 text-[#9ca3af]" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-[#f9fafb] flex items-center gap-2">
                                <Receipt className="h-6 w-6 text-[#8b5cf6]" />
                                Internal Billing Confirmation
                            </h1>
                            <p className="text-sm text-[#6b7280]">Complete billing for <span className="text-[#f9fafb] font-semibold">{form.hostelName}</span></p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-3 space-y-5">
                            {/* Payer Details */}
                            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] p-5 space-y-4">
                                <h3 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Payer Details</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-[#9ca3af] mb-1.5 uppercase tracking-wider">Payer Name</label>
                                        <input value={billing.payerName} onChange={e => setBilling(b => ({ ...b, payerName: e.target.value }))} placeholder="Name of person paying" className="w-full rounded-xl border border-[#1f2937] bg-[#020617] px-4 py-2.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[#9ca3af] mb-1.5 uppercase tracking-wider">Remarks (Optional)</label>
                                        <input value={billing.remarks} onChange={e => setBilling(b => ({ ...b, remarks: e.target.value }))} placeholder="Any notes" className="w-full rounded-xl border border-[#1f2937] bg-[#020617] px-4 py-2.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all" />
                                    </div>
                                </div>
                            </div>

                            {/* Plan Selection */}
                            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] p-5 space-y-4">
                                <h3 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Select Plan</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {HOSTEL_PLANS.map(p => (
                                        <button key={p.id} type="button" onClick={() => setBilling(b => ({ ...b, planType: p.id }))}
                                            className={`rounded-xl border p-4 text-center transition-all ${billing.planType === p.id ? "border-[#8b5cf6] bg-[#8b5cf6]/10 ring-1 ring-[#8b5cf6]" : "border-[#1f2937] bg-[#020617] hover:border-[#8b5cf6]/30"}`}>
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
                                        <button key={m.id} type="button" onClick={() => setBilling(b => ({ ...b, paymentMode: m.id }))}
                                            className={`rounded-xl border p-4 flex flex-col items-center gap-2 transition-all ${billing.paymentMode === m.id ? "border-[#8b5cf6] bg-[#8b5cf6]/10 ring-1 ring-[#8b5cf6]" : "border-[#1f2937] bg-[#020617] hover:border-[#8b5cf6]/30"}`}>
                                            <m.icon className={`h-5 w-5 ${billing.paymentMode === m.id ? "text-[#8b5cf6]" : "text-[#9ca3af]"}`} />
                                            <span className="text-sm font-bold text-[#f9fafb]">{m.name}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-[#6b7280] italic">Record-keeping only. No payment gateway will be triggered.</p>
                            </div>
                        </div>

                        {/* RIGHT: Billing Summary */}
                        <div className="lg:col-span-2 space-y-5">
                            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] p-5 space-y-4 sticky top-6">
                                <h3 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-[#8b5cf6]" /> Billing Summary
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between py-2 border-b border-[#1f2937]"><span className="text-[#6b7280]">Module</span><span className="text-[#f9fafb] font-bold flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-indigo-400" /> Hostel</span></div>
                                    <div className="flex justify-between py-2 border-b border-[#1f2937]"><span className="text-[#6b7280]">Plan</span><span className="text-[#f9fafb] font-bold">{selectedPlan.name}</span></div>
                                    <div className="flex justify-between py-2 border-b border-[#1f2937]"><span className="text-[#6b7280]">Duration</span><span className="text-[#f9fafb] font-medium">{selectedPlan.duration}</span></div>
                                    <div className="flex justify-between py-2 border-b border-[#1f2937]"><span className="text-[#6b7280]">Payment</span><span className="text-[#f9fafb] font-medium capitalize">{billing.paymentMode}</span></div>
                                    <div className="flex justify-between py-2 border-b border-[#1f2937]"><span className="text-[#6b7280]">Payer</span><span className="text-[#f9fafb] font-medium truncate ml-2">{billing.payerName || "—"}</span></div>
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

                                <button onClick={handleAdminConfirm} disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#8b5cf6]/20 transition-all disabled:opacity-50">
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

    // ── REGISTRATION FORM ──────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-12">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[100px] delay-700" />
            </div>

            <div className="relative w-full max-w-lg">
                <div className="bg-slate-950/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-8 ring-1 ring-white/5">
                    {isAdminMode && (
                        <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20">
                            <ShieldCheck className="h-4 w-4 text-[#8b5cf6]" />
                            <span className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wider">Super Admin Mode</span>
                        </div>
                    )}

                    <div className="flex flex-col items-center mb-8">
                        <div className="h-14 w-14 rounded-2xl bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 flex items-center justify-center shadow-lg shadow-indigo-900/50 mb-4">
                            <Building2 className="h-7 w-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Register Your Hostel</h1>
                        <p className="mt-1 text-sm text-slate-400">Set up your hostel management account in minutes</p>
                    </div>

                    <form onSubmit={handleFormSubmit} className="space-y-4">
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
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 active:bg-indigo-700 text-white text-sm font-semibold py-3 shadow-lg shadow-indigo-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            <Building2 className="h-4 w-4" />
                            {isAdminMode ? "Continue to Billing →" : loading ? "Creating Hostel…" : "Create Hostel Account"}
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

export default function HostelRegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="h-8 w-8 animate-spin text-[#8b5cf6]" />
            </div>
        }>
            <HostelRegisterInner />
        </Suspense>
    );
}
