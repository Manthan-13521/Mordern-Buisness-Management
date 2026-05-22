"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
    Store, 
    User, 
    Mail, 
    Phone, 
    Lock, 
    ArrowRight, 
    Loader2, 
    ShieldCheck,
    CheckCircle2,
    MapPin,
    CreditCard,
    Banknote,
    Smartphone,
    Receipt,
    ArrowLeft,
    Sparkles,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { signIn } from "next-auth/react";

declare global {
    interface Window {
        Razorpay: any;
    }
}

const BUSINESS_PLANS = [
    { id: "quarterly", name: "Quarterly", price: 1999, duration: "90 days" },
    { id: "yearly", name: "Yearly", price: 4999, duration: "365 days", popular: true },
];

const PAYMENT_MODES = [
    { id: "razorpay", name: "Razorpay", icon: CreditCard },
    { id: "upi", name: "UPI", icon: Smartphone },
    { id: "cash", name: "Cash", icon: Banknote },
];

function BusinessRegisterInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const isAdminMode = searchParams.get("admin") === "true";

    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1=business info, 2=admin info
    const [formData, setFormData] = useState({
        businessName: "",
        adminName: "",
        adminEmail: "",
        adminPhone: "",
        password: "",
        address: "",
        gstNumber: ""
    });

    // Admin billing state
    const [showBillingStep, setShowBillingStep] = useState(false);
    const [billing, setBilling] = useState({
        payerName: "",
        remarks: "",
        planType: "quarterly",
        paymentMode: "upi",
        referralCode: "",
    });
    const [referral, setReferral] = useState<{ code: string; discountType: string; discountValue: number } | null>(null);
    const [applyingReferral, setApplyingReferral] = useState(false);
    const [referralError, setReferralError] = useState("");
    const [success, setSuccess] = useState<{ name: string; slug: string } | null>(null);
    const [error, setError] = useState("");

    const selectedPlan = BUSINESS_PLANS.find(p => p.id === billing.planType) || BUSINESS_PLANS[0];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isAdminMode) {
            setShowBillingStep(true);
            return;
        }

        // Public flow: Create pending registration, then redirect to select-plan page
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/business/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Registration failed");
                toast.error(data.error || "Registration failed");
                setLoading(false);
                return;
            }

            // Store password in sessionStorage for auto-login after payment
            sessionStorage.setItem("biz_reg_password", formData.password);

            // Redirect to the separate plan selection page
            const params = new URLSearchParams({
                pendingId: data.pendingId,
                businessName: data.businessName || formData.businessName,
                email: data.email || formData.adminEmail,
                name: data.name || formData.adminName,
                phone: data.phone || formData.adminPhone,
            });

            router.push(`/business/select-plan?${params.toString()}`);
        } catch (err) {
            setError("An error occurred. Please try again.");
            toast.error("An error occurred. Please try again.");
            setLoading(false);
        }
    };

    // ── ADMIN FLOW (unchanged) ───────────────────────────────────────────
    const submitRegistration = async (billingData?: typeof billing) => {
        setLoading(true);
        setError("");

        try {
            const payload: any = { ...formData };

            if (billingData) {
                const planInfo = BUSINESS_PLANS.find(p => p.id === billingData.planType) || BUSINESS_PLANS[0];
                payload.adminBilling = {
                    payerName: billingData.payerName || "SuperAdmin",
                    remarks: billingData.remarks,
                    planType: billingData.planType,
                    amount: planInfo.price,
                    paymentMode: billingData.paymentMode,
                    duration: planInfo.duration,
                    referralCode: referral?.code || undefined,
                };
            }

            const res = await fetch("/api/business/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess({ name: data.business?.name, slug: data.business?.slug });
            } else {
                setError(data.error || "Registration failed");
                toast.error(data.error || "Registration failed");
                setLoading(false);
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
            toast.error("An error occurred. Please try again.");
            setLoading(false);
        }
    };

    const handleAdminConfirm = async () => {
        await submitRegistration(billing);
    };

    const handleApplyReferral = async () => {
        if (!billing.referralCode) return;
        setApplyingReferral(true);
        setReferralError("");
        try {
            const res = await fetch("/api/referral/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ referralCode: billing.referralCode })
            });
            const data = await res.json();
            if (res.ok) {
                setReferral({ code: data.code, discountType: data.discountType, discountValue: data.discountValue });
                toast.success(`Referral code ${data.code} applied!`);
            } else {
                setReferral(null);
                setReferralError(data.error || "Invalid referral code");
                toast.error(data.error || "Invalid referral code");
            }
        } catch (error) {
            setReferral(null);
            setReferralError("Failed to validate referral");
        } finally {
            setApplyingReferral(false);
        }
    };
    
    const calculateAdminTotal = () => {
        let total = selectedPlan.price;
        if (referral) {
            if (referral.discountType === "percentage") {
                total = total - (total * referral.discountValue / 100);
            } else if (referral.discountType === "flat") {
                total = total - referral.discountValue;
            }
        }
        return Math.max(1, Math.floor(total));
    };

    // ── SUCCESS SCREEN ───────────────────────────────────────────────────
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020617] px-4">
                <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
                    <div className="flex justify-center"><div className="h-16 w-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg"><CheckCircle2 className="h-8 w-8 text-white" /></div></div>
                    <h1 className="text-2xl font-bold text-[#f9fafb]">
                        {isAdminMode ? "Business Created!" : "Registration Complete!"}
                    </h1>
                    <p className="text-[#9ca3af] text-sm">
                        <span className="font-semibold text-[#f9fafb]">{success.name}</span> has been registered
                        {isAdminMode ? " with billing recorded." : " and your subscription is active."}
                    </p>
                    {isAdminMode ? (
                        <button
                            onClick={() => router.push("/superadmin/businesses")}
                            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-3 rounded-xl shadow transition"
                        >
                            ← Back to Business Management
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                window.location.href = `/business/${success.slug}/admin/dashboard`;
                            }}
                            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-3 rounded-xl shadow transition flex items-center justify-center gap-2"
                        >
                            Go to Dashboard <ArrowRight className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ── ADMIN BILLING CONFIRMATION STEP ──────────────────────────────────
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
                            <p className="text-sm text-[#6b7280]">Complete billing for <span className="text-[#f9fafb] font-semibold">{formData.businessName}</span></p>
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
                                    {BUSINESS_PLANS.map(p => (
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
                                    <div className="flex justify-between py-2 border-b border-[#1f2937]"><span className="text-[#6b7280]">Module</span><span className="text-[#f9fafb] font-bold flex items-center gap-1.5"><Store className="h-3.5 w-3.5 text-[#8b5cf6]" /> Business</span></div>
                                    <div className="flex justify-between py-2 border-b border-[#1f2937]"><span className="text-[#6b7280]">Plan</span><span className="text-[#f9fafb] font-bold">{selectedPlan.name}</span></div>
                                    <div className="flex justify-between py-2 border-b border-[#1f2937]"><span className="text-[#6b7280]">Duration</span><span className="text-[#f9fafb] font-medium">{selectedPlan.duration}</span></div>
                                    <div className="flex justify-between py-2 border-b border-[#1f2937]"><span className="text-[#6b7280]">Payment</span><span className="text-[#f9fafb] font-medium capitalize">{billing.paymentMode}</span></div>
                                    <div className="flex justify-between py-2 border-b border-[#1f2937]"><span className="text-[#6b7280]">Payer</span><span className="text-[#f9fafb] font-medium truncate ml-2">{billing.payerName || "—"}</span></div>
                                    
                                    {/* Referral Code UI */}
                                    <div className="py-2 border-b border-[#1f2937]">
                                        <label className="block text-[#6b7280] mb-2 text-xs">Referral Code (Optional)</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={billing.referralCode} 
                                                onChange={e => { setBilling(b => ({ ...b, referralCode: e.target.value.toUpperCase() })); setReferral(null); setReferralError(""); }} 
                                                placeholder="Enter code" 
                                                className="flex-1 rounded-lg border border-[#1f2937] bg-[#020617] px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#8b5cf6] font-mono uppercase"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={handleApplyReferral} 
                                                disabled={applyingReferral || !billing.referralCode || !!referral}
                                                className="px-3 py-1.5 bg-[#1f2937] hover:bg-[#374151] text-xs font-bold text-white rounded-lg transition disabled:opacity-50"
                                            >
                                                {applyingReferral ? <Loader2 className="h-4 w-4 animate-spin" /> : (referral ? "Applied" : "Apply")}
                                            </button>
                                        </div>
                                        {referralError && <p className="text-xs text-rose-400 mt-1">{referralError}</p>}
                                        {referral && <p className="text-xs text-emerald-400 mt-1 font-medium flex items-center gap-1"><Sparkles className="h-3 w-3" /> {referral.discountType === "percentage" ? `${referral.discountValue}%` : `₹${referral.discountValue}`} discount active</p>}
                                    </div>
                                    
                                    <div className="flex justify-between py-3 mt-2 rounded-xl bg-[#8b5cf6]/10 px-3">
                                        <span className="text-[#8b5cf6] font-bold">Final Total</span>
                                        <div className="text-right">
                                            {referral && <span className="block text-xs text-[#9ca3af] line-through font-normal">₹{selectedPlan.price.toLocaleString("en-IN")}</span>}
                                            <span className="text-[#8b5cf6] font-black text-lg">₹{calculateAdminTotal().toLocaleString("en-IN")}</span>
                                        </div>
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

    // ── REGISTRATION FORM (Steps 1 & 2) ─────────────────────────────────
    return (
        <div className="min-h-screen bg-[#020617] text-[#f9fafb] flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-xl animate-in fade-in duration-300">
                {/* Brand */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-[#0b1220] border border-[#1f2937] flex items-center justify-center mb-4">
                        <Store className="w-8 h-8 text-[#8b5cf6]" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#f9fafb] mb-2">Register Business</h1>
                    <p className="text-[#9ca3af] text-sm font-medium">Enterprise Suite Registration</p>
                </div>

                {isAdminMode && (
                    <div className="mb-6 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20">
                        <ShieldCheck className="h-4 w-4 text-[#8b5cf6]" />
                        <span className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wider">Super Admin Mode</span>
                    </div>
                )}

                {/* Progress Bar */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    {(isAdminMode ? [1, 2] : [1, 2, 3]).map((i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= i ? 'bg-[#8b5cf6] text-[#f9fafb]' : 'bg-[#111827] text-[#6b7280]'}`}>
                                {i}
                            </div>
                            {i < (isAdminMode ? 2 : 3) && <div className={`w-12 h-0.5 rounded-full ${step > i ? 'bg-[#8b5cf6]' : 'bg-[#1f2937]'}`} />}
                        </div>
                    ))}
                </div>

                {/* Step Labels for public flow */}
                {!isAdminMode && (
                    <div className="flex items-center justify-center gap-8 mb-6">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= 1 ? 'text-[#8b5cf6]' : 'text-[#6b7280]'}`}>Business Info</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= 2 ? 'text-[#8b5cf6]' : 'text-[#6b7280]'}`}>Admin Setup</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider text-[#6b7280]`}>Choose Plan</span>
                    </div>
                )}

                {/* Form Card */}
                <div className="bg-[#0b1220] border border-[#1f2937] p-8 rounded-2xl shadow-lg">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in duration-200">
                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold text-[#f9fafb] tracking-tight border-b border-[#1f2937] pb-3">Business Identity</h3>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest block">Company Name</label>
                                        <div className="relative group">
                                            <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] group-focus-within:text-[#8b5cf6] transition-colors" />
                                            <input 
                                                required
                                                type="text"
                                                name="businessName"
                                                placeholder="e.g. Apex Manufacturing Ltd"
                                                value={formData.businessName}
                                                onChange={handleChange}
                                                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-12 pr-6 py-3.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest block">Headquarters Address</label>
                                        <div className="relative group">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] group-focus-within:text-[#8b5cf6] transition-colors" />
                                            <input 
                                                required
                                                type="text"
                                                name="address"
                                                placeholder="City, State, Country"
                                                value={formData.address}
                                                onChange={handleChange}
                                                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-12 pr-6 py-3.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest block">GST Number <span className="opacity-50">(Optional)</span></label>
                                        <div className="relative group">
                                            <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] group-focus-within:text-[#8b5cf6] transition-colors" />
                                            <input 
                                                type="text"
                                                name="gstNumber"
                                                placeholder="e.g. 36AABCU9603R1ZM"
                                                value={formData.gstNumber}
                                                onChange={handleChange}
                                                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-12 pr-6 py-3.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <button 
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="w-full flex items-center justify-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-6 py-4 rounded-xl font-bold text-sm transition-all shadow-md"
                                    >
                                        Proceed to Admin Setup
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in duration-200">
                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold text-[#f9fafb] tracking-tight border-b border-[#1f2937] pb-3">Administrative Access</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest block">Full Name</label>
                                            <input 
                                                required
                                                type="text"
                                                name="adminName"
                                                placeholder="John Doe"
                                                value={formData.adminName}
                                                onChange={handleChange}
                                                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest block">Mobile Contact</label>
                                            <input 
                                                required
                                                type="tel"
                                                name="adminPhone"
                                                placeholder="9876543210"
                                                value={formData.adminPhone}
                                                onChange={handleChange}
                                                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest block">Enterprise Email</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] group-focus-within:text-[#8b5cf6] transition-colors" />
                                            <input 
                                                required
                                                type="email"
                                                name="adminEmail"
                                                placeholder="admin@company.com"
                                                value={formData.adminEmail}
                                                onChange={handleChange}
                                                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-12 pr-6 py-3.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest block">Secure Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] group-focus-within:text-[#8b5cf6] transition-colors" />
                                            <input 
                                                required
                                                type="password"
                                                name="password"
                                                placeholder="••••••••••••"
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-12 pr-6 py-3.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3">
                                        <p className="text-sm text-rose-400">{error}</p>
                                    </div>
                                )}

                                <div className="flex gap-4 pt-2">
                                    <button 
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-1 px-6 py-4 bg-[#111827] hover:bg-[#1f2937] text-[#9ca3af] font-bold rounded-xl transition-all border border-[#1f2937]"
                                    >
                                        Back
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] flex items-center justify-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white px-6 py-4 rounded-xl font-bold text-sm transition-all shadow-md"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                        {isAdminMode ? "Continue to Billing →" : "Choose Plan & Pay →"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                <div className="mt-8 flex items-center justify-center gap-6">
                    <p className="text-[#6b7280] text-xs text-center font-bold">
                        Already maintaining an account? <Link href="/login" className="text-[#8b5cf6] hover:text-[#7c3aed] ml-1 transition-colors">Access Portal</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function BusinessRegister() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#020617]">
                <Loader2 className="h-8 w-8 animate-spin text-[#8b5cf6]" />
            </div>
        }>
            <BusinessRegisterInner />
        </Suspense>
    );
}
