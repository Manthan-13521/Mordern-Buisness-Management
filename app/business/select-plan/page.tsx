"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, Zap, Shield, Tag, X, Sun, Moon, CreditCard, ArrowLeft } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import toast from "react-hot-toast";
import { signIn } from "next-auth/react";
import { loadRazorpay } from "@/lib/loadRazorpay";

declare global {
    interface Window {
        Razorpay: any;
    }
}

const PLAN_CARD = "relative bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-8 flex flex-col hover:border-violet-500/50 transition-all duration-300 group shadow-lg dark:shadow-none";
const SELECTED_PLAN = "ring-2 ring-violet-500 border-violet-500/50 bg-violet-500/5";

function BusinessSelectPlanInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

    // Get pending registration data from query params
    const pendingId = searchParams.get("pendingId") || "";
    const businessName = searchParams.get("businessName") || "Your Business";
    const adminEmail = searchParams.get("email") || "";
    const adminName = searchParams.get("name") || "";
    const adminPhone = searchParams.get("phone") || "";
    // Password is kept in sessionStorage for security (set by register page before redirect)
    const [password, setPassword] = useState("");

    // Referral State
    const [inputCode, setInputCode] = useState("");
    const [validatingRef, setValidatingRef] = useState(false);
    const [refError, setRefError] = useState("");
    const [appliedReferral, setAppliedReferral] = useState<{
        code: string;
        discountType: "percentage" | "flat";
        discountValue: number;
    } | null>(null);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        // Retrieve password from sessionStorage
        const pw = sessionStorage.getItem("biz_reg_password");
        if (pw) setPassword(pw);
    }, []);

    const handleApplyReferral = async () => {
        if (!inputCode) return;
        setValidatingRef(true);
        setRefError("");
        try {
            const res = await fetch("/api/referral/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ referralCode: inputCode }),
            });
            const data = await res.json();
            if (data.error) {
                setRefError(data.error);
                setAppliedReferral(null);
            } else {
                setAppliedReferral({
                    code: data.code,
                    discountType: data.discountType,
                    discountValue: data.discountValue,
                });
                setInputCode("");
            }
        } catch {
            setRefError("Failed to validate code");
        } finally {
            setValidatingRef(false);
        }
    };

    const removeReferral = () => {
        setAppliedReferral(null);
        setRefError("");
    };

    const getDiscountedPrice = (basePrice: number) => {
        if (!appliedReferral) return basePrice;
        let final = basePrice;
        if (appliedReferral.discountType === "percentage") {
            final -= (basePrice * appliedReferral.discountValue) / 100;
        } else {
            final -= appliedReferral.discountValue;
        }
        if (final <= 0) final = 1;
        return Math.floor(final);
    };

    const handlePayment = async (planType: string) => {
        if (!pendingId) {
            toast.error("Registration data missing. Please go back and register again.");
            return;
        }
        setSelectedPlan(planType);
        setLoading(true);

        try {
            // Step 1: Create Razorpay order via the business register API
            const res = await fetch("/api/business/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pendingId,
                    planType,
                    referralCode: appliedReferral?.code,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Failed to create order");
                setLoading(false);
                setSelectedPlan(null);
                return;
            }

            const { orderId, amount, keyId, isMock, currency } = data;

            // Step 2: Mock mode (dev)
            if (isMock) {
                const finalizeRes = await fetch("/api/business/register/finalize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        pendingRegistrationId: pendingId,
                        isMock: true,
                        razorpayOrderId: orderId,
                    }),
                });
                const finalizeData = await finalizeRes.json();
                if (finalizeData.success) {
                    await signIn("credentials", {
                        redirect: false,
                        username: adminEmail,
                        password: password,
                    });
                    toast.success("Registration successful!");
                    sessionStorage.removeItem("biz_reg_password");
                    window.location.href = `/business/${finalizeData.businessSlug}/admin/dashboard`;
                } else {
                    toast.error(finalizeData.error || "Registration failed");
                }
                setLoading(false);
                setSelectedPlan(null);
                return;
            }

            // Step 3: Real Razorpay
            const isLoaded = await loadRazorpay();
            if (!isLoaded || typeof window.Razorpay === "undefined") {
                toast.error("Payment gateway failed to load. Please check your connection or disable ad-blockers.");
                setLoading(false);
                setSelectedPlan(null);
                return;
            }

            const options = {
                key: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount,
                currency: currency || "INR",
                name: "AquaSync SaaS",
                description: `Business ${planType.toUpperCase()} Plan`,
                order_id: orderId,
                handler: async (response: any) => {
                    try {
                        const finalizeRes = await fetch("/api/business/register/finalize", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                pendingRegistrationId: pendingId,
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature,
                            }),
                        });
                        const finalizeData = await finalizeRes.json();
                        if (finalizeData.success) {
                            await signIn("credentials", {
                                redirect: false,
                                username: adminEmail,
                                password: password,
                            });
                            toast.success("Payment successful! Account created.");
                            sessionStorage.removeItem("biz_reg_password");
                            window.location.href = `/business/${finalizeData.businessSlug}/admin/dashboard`;
                        } else {
                            toast.error(finalizeData.error || "Account creation failed after payment. Contact support.");
                        }
                    } catch (err) {
                        console.error("Finalize error", err);
                        toast.error("Payment received but account creation failed. Please contact support.");
                    } finally {
                        setLoading(false);
                        setSelectedPlan(null);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setLoading(false);
                        setSelectedPlan(null);
                        toast.error("Payment was cancelled. You can retry anytime.");
                    },
                },
                prefill: {
                    name: adminName,
                    email: adminEmail,
                    contact: adminPhone,
                },
                theme: { color: "#8b5cf6" },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", (response: any) => {
                toast.error(`Payment failed: ${response.error?.description || "Unknown error"}`);
                setLoading(false);
                setSelectedPlan(null);
            });
            rzp.open();
        } catch (error: any) {
            console.error("Payment error:", error);
            toast.error(`Error: ${error.message || "Something went wrong"}`);
            setLoading(false);
            setSelectedPlan(null);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-violet-500/30 transition-colors duration-300">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-violet-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            {/* Theme Toggle */}
            {mounted && (
                <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white/10 dark:bg-white/10 backdrop-blur-md border border-slate-200 dark:border-white/20 shadow-lg hover:scale-110 transition-all duration-200"
                    aria-label="Toggle Theme"
                >
                    {theme === "dark" ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-700" />}
                </button>
            )}

            <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-24">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Registration
                </button>

                {/* Header */}
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-500 dark:text-violet-400 text-xs font-bold uppercase tracking-widest animate-bounce">
                        <Sparkles className="h-3 w-3" /> Subscription Plans
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-b from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                        Power Up Your Business
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                        Choose the plan that fits <span className="font-semibold text-violet-500">{businessName}</span>. 
                        Trial accounts available for new users to explore all premium features.
                    </p>
                </div>

                {/* Referral Code UI */}
                <div className="max-w-md mx-auto mb-16 relative z-10">
                    <div className="bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl">
                        {!appliedReferral ? (
                            <>
                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-violet-400" /> Have a referral code?
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="ENTER CODE"
                                        value={inputCode}
                                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                        className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 uppercase font-mono"
                                        disabled={validatingRef}
                                    />
                                    <button
                                        onClick={handleApplyReferral}
                                        disabled={validatingRef || !inputCode}
                                        className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 min-w-[100px]"
                                    >
                                        {validatingRef ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Apply"}
                                    </button>
                                </div>
                                {refError && <p className="text-red-400 text-sm mt-3 animate-in fade-in">{refError}</p>}
                                <p className="text-slate-400 dark:text-slate-500 text-xs mt-3">Discounts apply to regular SaaS plans. Trial accounts are excluded.</p>
                            </>
                        ) : (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <h4 className="text-emerald-400 font-bold flex items-center gap-2">
                                        <Check className="h-4 w-4" /> Code Applied: {appliedReferral.code}
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                        You are getting a {appliedReferral.discountType === "percentage" ? `${appliedReferral.discountValue}%` : `₹${appliedReferral.discountValue}`} discount!
                                    </p>
                                </div>
                                <button
                                    onClick={removeReferral}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-all"
                                    title="Remove Code"
                                >
                                    <X className="h-5 w-5 text-slate-400 hover:text-white" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Plan Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                    {/* Trial Plan */}
                    <div className={PLAN_CARD}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold">Free Trial</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">7 Days Full Access</p>
                            </div>
                            <div className="p-2 bg-emerald-500/10 rounded-xl">
                                <Zap className="h-6 w-6 text-emerald-400" />
                            </div>
                        </div>
                        <div className="mb-8">
                            <span className="text-4xl font-black">₹2</span>
                            <span className="text-slate-500 dark:text-slate-400 ml-2">to verify identity</span>
                        </div>
                        <ul className="space-y-4 mb-8 flex-grow">
                            <FeatureItem text="All Business Features" />
                            <FeatureItem text="Sales & Stock Management" />
                            <FeatureItem text="Labour Tracking" />
                            <FeatureItem text="7 Days Duration" />
                        </ul>
                        <button
                            onClick={() => handlePayment("trial")}
                            disabled={loading}
                            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white transition-all shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50"
                        >
                            {loading && selectedPlan === "trial" ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Start 7-Day Trial"}
                        </button>
                    </div>

                    {/* Quarterly Plan */}
                    <div className={PLAN_CARD}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold">Quarterly Plan</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">3 Months Access</p>
                            </div>
                            <div className="p-2 bg-violet-500/10 rounded-xl">
                                <Shield className="h-6 w-6 text-violet-400" />
                            </div>
                        </div>
                        <div className="mb-8">
                            {appliedReferral ? (
                                <div className="flex flex-col">
                                    <span className="text-slate-500 line-through text-2xl font-bold">₹1,999</span>
                                    <span className="text-4xl font-black text-emerald-400">₹{getDiscountedPrice(1999).toLocaleString()}</span>
                                    <span className="text-emerald-500/70 text-sm mt-1">Discount applied!</span>
                                </div>
                            ) : (
                                <>
                                    <span className="text-4xl font-black">₹1,999</span>
                                    <span className="text-slate-500 dark:text-slate-400 ml-2">/ 3 months</span>
                                </>
                            )}
                        </div>
                        <ul className="space-y-4 mb-8 flex-grow">
                            <FeatureItem text="Unlimited Sales Logs" />
                            <FeatureItem text="Labour Management" />
                            <FeatureItem text="Stock Inventory" />
                            <FeatureItem text="Digital Customer Ledger" />
                            <FeatureItem text="Professional Invoicing" />
                        </ul>
                        <button
                            onClick={() => handlePayment("quarterly")}
                            disabled={loading}
                            className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 font-bold text-white transition-all shadow-lg shadow-violet-900/20 active:scale-95 disabled:opacity-50"
                        >
                            {loading && selectedPlan === "quarterly" ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Choose Quarterly"}
                        </button>
                    </div>

                    {/* Yearly Plan — Best Value */}
                    <div className={`${PLAN_CARD} border-violet-500/50 ring-1 ring-violet-500/20 bg-violet-500/5`}>
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-violet-500 rounded-full text-xs font-black uppercase tracking-widest text-white">
                            Most Popular
                        </div>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold">Yearly Plan</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">Best Value for Business</p>
                            </div>
                            <div className="p-2 bg-violet-500/20 rounded-xl">
                                <Sparkles className="h-6 w-6 text-violet-400" />
                            </div>
                        </div>
                        <div className="mb-8">
                            {appliedReferral ? (
                                <div className="flex flex-col">
                                    <span className="text-slate-500 line-through text-2xl font-bold">₹4,999</span>
                                    <span className="text-5xl font-black text-emerald-400">₹{getDiscountedPrice(4999).toLocaleString()}</span>
                                    <span className="text-emerald-500/70 text-sm mt-1">Huge discount applied!</span>
                                </div>
                            ) : (
                                <>
                                    <span className="text-4xl font-black">₹4,999</span>
                                    <span className="text-slate-500 dark:text-slate-400 ml-2">/ year</span>
                                    <div className="mt-2 text-violet-400 text-sm font-medium">Save ₹2,997 vs quarterly</div>
                                </>
                            )}
                        </div>
                        <ul className="space-y-4 mb-8 flex-grow">
                            <FeatureItem text="All Business Modules Included" />
                            <FeatureItem text="Revenue Analytics" />
                            <FeatureItem text="Staff & Labour Attendance" />
                            <FeatureItem text="Multi-Admin Access" />
                            <FeatureItem text="24/7 Priority Support" />
                            <FeatureItem text="WhatsApp Notifications" />
                        </ul>
                        <button
                            onClick={() => handlePayment("yearly")}
                            disabled={loading}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-bold text-white transition-all shadow-xl shadow-violet-900/40 active:scale-95 disabled:opacity-50"
                        >
                            {loading && selectedPlan === "yearly" ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Choose Yearly"}
                        </button>
                    </div>
                </div>

                <div className="mt-24 text-center">
                    <p className="text-slate-500 text-sm max-w-lg mx-auto">
                        Need a custom enterprise solution? Contact our sales team at <span className="text-violet-400 font-medium">sales@aquasync.io</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ text }: { text: string }) {
    return (
        <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <div className="flex-shrink-0 h-5 w-5 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <span className="text-sm">{text}</span>
        </li>
    );
}

export default function BusinessSelectPlan() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
                <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
            </div>
        }>
            <BusinessSelectPlanInner />
        </Suspense>
    );
}
