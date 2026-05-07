"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Check, Loader2, Sparkles, Zap, Shield, Blocks, Tag, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { SUBSCRIPTION_PRICES, SubscriptionPlanType, SubscriptionModule } from "@/lib/subscriptionConfig";
import { loadRazorpay } from "@/lib/loadRazorpay";
import toast from "react-hot-toast";

declare global {
    interface Window {
        Razorpay: any;
    }
}

const PLAN_CARD = "relative bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-8 flex flex-col hover:border-sky-500/50 transition-all duration-300 group shadow-lg dark:shadow-none";
const SELECTED_PLAN = "ring-2 ring-sky-500 border-sky-500/50 bg-sky-500/5";

export default function SelectPlanPage() {
    const { data: session, status, update: updateSession } = useSession() as any;
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [trialUsed, setTrialUsed] = useState(false);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);
    
    // Determine module from session (fallback to pool if no session yet)
    const module: SubscriptionModule = session?.user?.businessId 
        ? "business" 
        : session?.user?.hostelId 
            ? "hostel" 
            : "pool";
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType | null>(null);
    const [selectedBlocks, setSelectedBlocks] = useState<number>(1);
    
    // Referral State
    const [inputCode, setInputCode] = useState("");
    const [validatingRef, setValidatingRef] = useState(false);
    const [refError, setRefError] = useState("");
    const [appliedReferral, setAppliedReferral] = useState<{
        code: string;
        discountType: "percentage" | "flat";
        discountValue: number;
    } | null>(null);

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
        } catch (e) {
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

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && session) {
            fetchStatus();
        }
    }, [session, status, router]);

    const fetchStatus = async () => {
        try {
            const res = await fetch("/api/subscription/status");
            const data = await res.json();
            setTrialUsed(data.trialUsed);
            
            // If already active and not expired, maybe redirect?
            // But they might want to renew/extend.
            if (data.status === "active" && data.daysLeft > 30) {
                // router.push(session.user.hostelId ? `/hostel/${session.user.hostelSlug}/admin/dashboard` : `/${session.user.poolSlug}/admin/dashboard`);
            }
        } catch (error) {
            console.error("Failed to fetch status", error);
        } finally {
            setPageLoading(false);
        }
    };

    /**
     * After payment/activation, refresh the JWT session (triggers DB re-fetch)
     * then poll /api/subscription/status to confirm it's active before redirecting.
     * Handles the race condition where webhook hasn't processed yet.
     */
    const waitForSubscriptionActive = async (maxAttempts = 5): Promise<boolean> => {
        // 1. Trigger JWT re-fetch from DB
        await updateSession();
        
        // 2. Poll status API to confirm activation
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const res = await fetch("/api/subscription/status");
                const data = await res.json();
                if (data.status === "active" || data.status === "trial") {
                    // Re-trigger session update one more time to ensure JWT has latest
                    await updateSession();
                    return true;
                }
            } catch (e) {
                console.warn("Subscription status check failed:", e);
            }
            // Wait 1.5s between polls
            await new Promise(r => setTimeout(r, 1500));
        }
        return false;
    };

    const getRedirectUrl = () => {
        if (session.user.hostelId) return `/hostel/${session.user.hostelSlug}/admin/dashboard`;
        if (session.user.businessId) return `/business/${session.user.businessSlug}/admin/dashboard`;
        return `/${session.user.poolSlug}/admin/dashboard`;
    };

    const handlePayment = async (planType: SubscriptionPlanType, blocks?: number) => {
        setSelectedPlan(planType);
        setLoading(true);
        try {
            const res = await fetch("/api/subscription/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    planType, 
                    module, 
                    blocks,
                    referralCode: appliedReferral?.code 
                }),
            });
            const orderData = await res.json();

            if (orderData.error) {
                // Show detailed error in development, user-friendly in production
                const debugInfo = orderData.debug ? `\n\nDebug: ${JSON.stringify(orderData.debug)}` : "";
                const errorCode = orderData.code ? ` [${orderData.code}]` : "";
                toast.error(`${orderData.error}${errorCode}${debugInfo}`);
                setLoading(false);
                setSelectedPlan(null);
                return;
            }

            if (orderData.isMock) {
                // Handle Mock Activation
                const verifyRes = await fetch("/api/subscription/activate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        isMock: true, 
                        planType, 
                        module, 
                        blocks,
                        razorpayOrderId: orderData.orderId 
                    }),
                });
                const verifyData = await verifyRes.json();
                if (verifyData.success) {
                    const isActive = await waitForSubscriptionActive();
                    if (isActive) {
                        toast.success("Subscription activated successfully!");
                        window.location.href = getRedirectUrl();
                    } else {
                        toast.error("Subscription activated but session sync is delayed. Please refresh the page or re-login.");
                        window.location.href = getRedirectUrl();
                    }
                } else {
                    toast.error(verifyData.error || "Activation failed. Please try again.");
                }
                return;
            }

            // Real Razorpay — Ensure script is loaded
            const isLoaded = await loadRazorpay();
            if (!isLoaded || typeof window.Razorpay === "undefined") {
                console.error("Razorpay SDK failed to load");
                toast.error("Payment gateway failed to load. Please check your connection or disable ad-blockers and try again.");
                setLoading(false);
                setSelectedPlan(null);
                return;
            }

            console.log("Initializing Razorpay with order:", {
                orderId: orderData.orderId,
                amount: orderData.amount,
                hasKey: !!(orderData.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)
            });

            const options = {
                key: orderData.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "AquaSync SaaS",
                description: `${planType.toUpperCase()} Plan - ${module.toUpperCase()}`,
                order_id: orderData.orderId,
                handler: async (response: any) => {
                    console.log("Payment success handler triggered", response);
                    try {
                        const verifyRes = await fetch("/api/subscription/activate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature,
                                planType,
                                module,
                                blocks,
                            }),
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            const isActive = await waitForSubscriptionActive();
                            if (isActive) {
                                toast.success("Payment successful!");
                                window.location.href = getRedirectUrl();
                            } else {
                                toast.error("Payment successful! Session sync is delayed. Redirecting...");
                                window.location.href = getRedirectUrl();
                            }
                        } else {
                            toast.error(verifyData.error || "Payment verification failed. Contact support if amount was deducted.");
                        }
                    } catch (err) {
                        console.error("Verification error", err);
                        toast.error("Payment received but verification failed. Please contact support.");
                    } finally {
                        setLoading(false);
                        setSelectedPlan(null);
                    }
                },
                modal: {
                    ondismiss: () => {
                        console.log("Razorpay modal dismissed");
                        setLoading(false);
                        setSelectedPlan(null);
                    },
                },
                prefill: {
                    name: session.user.name,
                    email: session.user.email,
                },
                theme: { color: "#0ea5e9" },
            };

            try {
                const rzp = new window.Razorpay(options);
                rzp.on("payment.failed", (response: any) => {
                    console.error("Payment failed event:", response.error);
                    toast.error(`Payment failed: ${response.error?.description || "Unknown error"}`);
                    setLoading(false);
                    setSelectedPlan(null);
                });
                console.log("Opening Razorpay modal...");
                rzp.open();
            } catch (rzpErr: any) {
                console.error("Razorpay initialization error:", rzpErr);
                toast.error(`Failed to open payment popup: ${rzpErr.message}`);
                setLoading(false);
                setSelectedPlan(null);
            }
            return;
        } catch (error: any) {
            console.error("Global payment error:", error);
            toast.error(`Error: ${error.message || "Something went wrong"}`);
        } finally {
            setLoading(false);
            setSelectedPlan(null);
        }
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-sky-500/30 transition-colors duration-300">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-sky-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            {/* Theme Toggle Button */}
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
                {/* Header */}
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold uppercase tracking-widest animate-bounce">
                        <Sparkles className="h-3 w-3" /> Subscription Plans
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-b from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                        Empower Your {module === "pool" ? "Aquatic" : module === "hostel" ? "Hostel" : "Business"} Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                        Choose the plan that fits your scale. Trial accounts available for new users to explore the premium features.
                    </p>
                </div>

                {/* Referral Code UI */}
                <div className="max-w-md mx-auto mb-16 relative z-10">
                    <div className="bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl">
                        {!appliedReferral ? (
                            <>
                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-sky-400" /> Have a referral code?
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter code"
                                        value={inputCode}
                                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                        className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase font-mono"
                                        disabled={validatingRef}
                                    />
                                    <button
                                        onClick={handleApplyReferral}
                                        disabled={validatingRef || !inputCode}
                                        className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 min-w-[100px]"
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
                                    <p className="text-sm text-slate-300 mt-1">
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

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                    {/* Trial Plan */}
                    {!trialUsed && (
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
                                <FeatureItem text="All Premium Features" />
                                <FeatureItem text="Complete Data Support" />
                                <FeatureItem text="WhatsApp Notifications" />
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
                    )}

                    {module === "pool" ? (
                        <>
                            {/* Pool Quarterly */}
                            <div className={PLAN_CARD}>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold">Quarterly Plan</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">3 Months Access</p>
                                    </div>
                                    <div className="p-2 bg-sky-500/10 rounded-xl">
                                        <Shield className="h-6 w-6 text-sky-400" />
                                    </div>
                                </div>
                                <div className="mb-8">
                                    {appliedReferral ? (
                                        <div className="flex flex-col">
                                            <span className="text-slate-500 line-through text-2xl font-bold">₹2,999</span>
                                            <span className="text-4xl font-black text-emerald-400">₹{getDiscountedPrice(2999).toLocaleString()}</span>
                                            <span className="text-emerald-500/70 text-sm mt-1">Discount applied!</span>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-4xl font-black">₹2,999</span>
                                            <span className="text-slate-500 dark:text-slate-400 ml-2">/ 3 months</span>
                                        </>
                                    )}
                                </div>
                                <ul className="space-y-4 mb-8 flex-grow">
                                    <FeatureItem text="Everything in Trial" />
                                    <FeatureItem text="Priority Support" />
                                    <FeatureItem text="Annual Renewals available" />
                                    <FeatureItem text="Unlimited Members" />
                                </ul>
                                <button
                                    onClick={() => handlePayment("quarterly")}
                                    disabled={loading}
                                    className="w-full py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 font-bold text-white transition-all shadow-lg shadow-sky-900/20 active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Choose Quarterly"}
                                </button>
                            </div>

                            {/* Pool Yearly */}
                            <div className={`${PLAN_CARD} border-sky-500/50 ring-1 ring-sky-500/20 bg-sky-500/5`}>
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-sky-500 rounded-full text-xs font-black uppercase tracking-widest text-slate-950">
                                    Most Popular
                                </div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold">Yearly Plan</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">Best Value for Pools</p>
                                    </div>
                                    <div className="p-2 bg-sky-500/20 rounded-xl">
                                        <Sparkles className="h-6 w-6 text-sky-400" />
                                    </div>
                                </div>
                                <div className="mb-8">
                                    {appliedReferral ? (
                                        <div className="flex flex-col">
                                            <span className="text-slate-500 line-through text-2xl font-bold">₹7,999</span>
                                            <span className="text-5xl font-black text-emerald-400">₹{getDiscountedPrice(7999).toLocaleString()}</span>
                                            <span className="text-emerald-500/70 text-sm mt-1">Huge discount applied!</span>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-4xl font-black">₹7,999</span>
                                            <span className="text-slate-500 dark:text-slate-400 ml-2">/ year</span>
                                            <div className="mt-2 text-sky-400 text-sm font-medium">Save ₹4,001 vs quarterly</div>
                                        </>
                                    )}
                                </div>
                                <ul className="space-y-4 mb-8 flex-grow">
                                    <FeatureItem text="12 Months Access" />
                                    <FeatureItem text="Standard Onboarding" />
                                    <FeatureItem text="Advanced Analytics" />
                                    <FeatureItem text="Unlimited Everything" />
                                </ul>
                                <button
                                    onClick={() => handlePayment("yearly")}
                                    disabled={loading}
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 font-bold text-white transition-all shadow-xl shadow-sky-900/40 active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Choose Yearly"}
                                </button>
                            </div>
                        </>
                    ) : module === "business" ? (
                        <>
                            {/* Business Quarterly */}
                            <div className={PLAN_CARD}>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold">3 Months Plan</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">Quarterly Business Access</p>
                                    </div>
                                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                                        <Shield className="h-6 w-6 text-emerald-400" />
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
                                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white transition-all shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50"
                                >
                                    {loading && selectedPlan === "quarterly" ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Choose 3 Months"}
                                </button>
                            </div>

                            {/* Business Yearly — Best Value */}
                            <div className={`${PLAN_CARD} border-emerald-500/50 ring-1 ring-emerald-500/20 bg-emerald-500/5`}>
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 rounded-full text-xs font-black uppercase tracking-widest text-slate-950">
                                    Best Value
                                </div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold">Yearly Plan</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">Full Access — 12 Months</p>
                                    </div>
                                    <div className="p-2 bg-emerald-500/20 rounded-xl">
                                        <Sparkles className="h-6 w-6 text-emerald-400" />
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
                                            <div className="mt-2 text-emerald-400 text-sm font-medium">Save ₹2,997 vs quarterly</div>
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
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 font-bold text-white transition-all shadow-xl shadow-emerald-900/40 active:scale-95 disabled:opacity-50"
                                >
                                    {loading && selectedPlan === "yearly" ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Choose Yearly — Best Value"}
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Hostel Block-Based */
                        <div className={`${PLAN_CARD} border-sky-500/50 ring-1 ring-sky-500/20 bg-sky-500/5 col-span-1 lg:col-span-2`}>
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-sky-500 rounded-full text-xs font-black uppercase tracking-widest text-slate-950">
                                Block-Based Pricing
                            </div>
                            <div className="grid lg:grid-cols-2 gap-8 h-full">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold">Hostel Annual Plan</h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm">Pay per Block (12 Months)</p>
                                        </div>
                                        <div className="p-2 bg-sky-500/20 rounded-xl">
                                            <Blocks className="h-6 w-6 text-sky-400" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Select Number of Blocks</label>
                                        <div className="grid grid-cols-4 gap-4">
                                            {[1, 2, 3, 4].map(b => (
                                                <button
                                                    key={b}
                                                    onClick={() => setSelectedBlocks(b)}
                                                    className={`py-3 rounded-xl border font-bold transition-all ${selectedBlocks === b ? 'bg-sky-500 border-sky-500 text-slate-950' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-white/10 hover:border-sky-500/50'}`}
                                                >
                                                    {b}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                                        <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Fee</div>
                                        {appliedReferral ? (
                                            <div className="flex flex-col">
                                                <span className="text-slate-500 line-through text-2xl font-bold">₹{SUBSCRIPTION_PRICES[`hostel_${selectedBlocks}` as keyof typeof SUBSCRIPTION_PRICES]?.toLocaleString()}</span>
                                                <span className="text-5xl font-black text-emerald-400">₹{getDiscountedPrice(SUBSCRIPTION_PRICES[`hostel_${selectedBlocks}` as keyof typeof SUBSCRIPTION_PRICES] || 0).toLocaleString()}</span>
                                            </div>
                                        ) : (
                                            <div className="text-5xl font-black">₹{SUBSCRIPTION_PRICES[`hostel_${selectedBlocks}` as keyof typeof SUBSCRIPTION_PRICES]?.toLocaleString()}</div>
                                        )}
                                        <div className="text-sky-400 text-sm mt-2">Flat 12-month license fee</div>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <ul className="space-y-4 mb-8 flex-grow">
                                        <FeatureItem text="Unlimited Students/Rooms" />
                                        <FeatureItem text="Complete Inventory Mgmt" />
                                        <FeatureItem text="Rent Automation" />
                                        <FeatureItem text="Daily WhatsApp Reports" />
                                        <FeatureItem text="Dedicated Account Manager" />
                                    </ul>
                                    <button
                                        onClick={() => handlePayment("block-based", selectedBlocks)}
                                        disabled={loading}
                                        className="w-full py-5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 font-bold text-white transition-all shadow-xl shadow-sky-900/40 active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : `Activate ${selectedBlocks} Block Plan`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-24 text-center">
                    <p className="text-slate-500 text-sm max-w-lg mx-auto">
                        Need a custom enterprise solution or more than 4 blocks? Contact our sales team at <span className="text-sky-400 font-mediumSelection:bg-sky-500/30 font-medium">sales@aquasync.io</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ text }: { text: string }) {
    return (
        <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <div className="flex-shrink-0 h-5 w-5 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <span className="text-sm">{text}</span>
        </li>
    );
}
