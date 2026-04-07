"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, Zap, Shield, Blocks } from "lucide-react";
import { SUBSCRIPTION_PRICES, SubscriptionPlanType, SubscriptionModule } from "@/lib/subscriptionConfig";

declare global {
    interface Window {
        Razorpay: any;
    }
}

const PLAN_CARD = "relative bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col hover:border-sky-500/50 transition-all duration-300 group";
const SELECTED_PLAN = "ring-2 ring-sky-500 border-sky-500/50 bg-sky-500/5";

export default function SelectPlanPage() {
    const { data: session, status, update: updateSession } = useSession() as any;
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [trialUsed, setTrialUsed] = useState(false);
    
    // Determine module from session (fallback to pool if no session yet)
    const module: SubscriptionModule = session?.user?.hostelId ? "hostel" : "pool";
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType | null>(null);
    const [selectedBlocks, setSelectedBlocks] = useState<number>(1);

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

    const handlePayment = async (planType: SubscriptionPlanType, blocks?: number) => {
        setLoading(true);
        try {
            const res = await fetch("/api/subscription/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planType, module, blocks }),
            });
            const orderData = await res.json();

            if (orderData.error) {
                alert(orderData.error);
                setLoading(false);
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
                    await updateSession();
                    window.location.href = session.user.hostelId 
                        ? `/hostel/${session.user.hostelSlug}/admin/dashboard` 
                        : `/${session.user.poolSlug}/admin/dashboard`;
                }
                return;
            }

            // Real Razorpay
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "AquaSync SaaS",
                description: `${planType.toUpperCase()} Plan - ${module.toUpperCase()}`,
                order_id: orderData.orderId,
                handler: async (response: any) => {
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
                        await updateSession();
                        window.location.href = session.user.hostelId 
                            ? `/hostel/${session.user.hostelSlug}/admin/dashboard` 
                            : `/${session.user.poolSlug}/admin/dashboard`;
                    }
                },
                prefill: {
                    name: session.user.name,
                    email: session.user.email,
                },
                theme: { color: "#0ea5e9" },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) {
            console.error("Payment error", error);
            alert("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-sky-500/30">
            {/* Razorpay Script */}
            <script src="https://checkout.razorpay.com/v1/checkout.js" async />

            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-sky-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-24">
                {/* Header */}
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold uppercase tracking-widest animate-bounce">
                        <Sparkles className="h-3 w-3" /> Subscription Plans
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                        Empower Your {module === "pool" ? "Aquatic" : "Hostel"} Management
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Choose the plan that fits your scale. Trial accounts available for new users to explore the premium features.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                    {/* Trial Plan */}
                    {!trialUsed && (
                        <div className={PLAN_CARD}>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold">Free Trial</h3>
                                    <p className="text-slate-400 text-sm">7 Days Full Access</p>
                                </div>
                                <div className="p-2 bg-emerald-500/10 rounded-xl">
                                    <Zap className="h-6 w-6 text-emerald-400" />
                                </div>
                            </div>
                            <div className="mb-8">
                                <span className="text-4xl font-black">₹2</span>
                                <span className="text-slate-400 ml-2">to verify identity</span>
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
                                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold transition-all shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50"
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
                                        <p className="text-slate-400 text-sm">3 Months Access</p>
                                    </div>
                                    <div className="p-2 bg-sky-500/10 rounded-xl">
                                        <Shield className="h-6 w-6 text-sky-400" />
                                    </div>
                                </div>
                                <div className="mb-8">
                                    <span className="text-4xl font-black">₹2,999</span>
                                    <span className="text-slate-400 ml-2">/ 3 months</span>
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
                                    className="w-full py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 font-bold transition-all shadow-lg shadow-sky-900/20 active:scale-95 disabled:opacity-50"
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
                                        <p className="text-slate-400 text-sm">Best Value for Pools</p>
                                    </div>
                                    <div className="p-2 bg-sky-500/20 rounded-xl">
                                        <Sparkles className="h-6 w-6 text-sky-400" />
                                    </div>
                                </div>
                                <div className="mb-8">
                                    <span className="text-4xl font-black">₹7,999</span>
                                    <span className="text-slate-400 ml-2">/ year</span>
                                    <div className="mt-2 text-sky-400 text-sm font-medium">Save ₹4,001 vs quarterly</div>
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
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 font-bold transition-all shadow-xl shadow-sky-900/40 active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Choose Yearly"}
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
                                            <p className="text-slate-400 text-sm">Pay per Block (12 Months)</p>
                                        </div>
                                        <div className="p-2 bg-sky-500/20 rounded-xl">
                                            <Blocks className="h-6 w-6 text-sky-400" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider">Select Number of Blocks</label>
                                        <div className="grid grid-cols-4 gap-4">
                                            {[1, 2, 3, 4].map(b => (
                                                <button
                                                    key={b}
                                                    onClick={() => setSelectedBlocks(b)}
                                                    className={`py-3 rounded-xl border font-bold transition-all ${selectedBlocks === b ? 'bg-sky-500 border-sky-500 text-slate-950' : 'bg-slate-800 border-white/10 hover:border-sky-500/50'}`}
                                                >
                                                    {b}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/10">
                                        <div className="text-sm text-slate-400 mb-1">Total Fee</div>
                                        <div className="text-5xl font-black">₹{SUBSCRIPTION_PRICES[`hostel_${selectedBlocks}`]?.toLocaleString()}</div>
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
                                        className="w-full py-5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 font-bold transition-all shadow-xl shadow-sky-900/40 active:scale-95 disabled:opacity-50"
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
        <li className="flex items-center gap-3 text-slate-300">
            <div className="flex-shrink-0 h-5 w-5 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <span className="text-sm">{text}</span>
        </li>
    );
}
