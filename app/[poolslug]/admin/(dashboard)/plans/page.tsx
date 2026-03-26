"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";


interface Plan {
    _id: string;
    name: string;
    durationDays: number;
    price: number;
    features: string[];
    whatsAppAlert?: boolean;
    allowQuantity?: boolean;
    voiceAlert?: boolean;
    hasEntertainment?: boolean;
    hasFaceScan?: boolean;
    quickDelete?: boolean;
    hasTokenPrint?: boolean;
}

export default function PlansPage() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "admin";

    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editPlanId, setEditPlanId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        durationValue: 30,
        durationType: "days",
        price: 0,
        features: "",
        whatsAppAlert: false,
        allowQuantity: false,
        voiceAlert: false,
        hasEntertainment: false,
        hasFaceScan: false,
        quickDelete: false,
        hasTokenPrint: false,
    });

    const fetchPlans = () => {
        setLoading(true);
        fetch("/api/plans?limit=100")
            .then((res) => res.json())
            .then((data) => {
                // Handle both plain array (legacy) and paginated {data:[]} response
                const planList = Array.isArray(data) ? data : (data.data ?? []);
                setPlans(planList);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch plans", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanFeatures = formData.features.split(",").map(f => f.trim()).filter(Boolean);

        const payload = {
            name: formData.name,
            price: formData.price,
            features: cleanFeatures,
            whatsAppAlert: formData.whatsAppAlert,
            allowQuantity: formData.allowQuantity,
            voiceAlert: formData.voiceAlert,
            hasEntertainment: formData.hasEntertainment,
            hasFaceScan: formData.hasFaceScan,
            quickDelete: formData.quickDelete,
            hasTokenPrint: formData.hasTokenPrint,
            ...(formData.durationType === "days" ? { durationDays: formData.durationValue } : 
               formData.durationType === "hours" ? { durationHours: formData.durationValue } :
               formData.durationType === "minutes" ? { durationMinutes: formData.durationValue } :
               { durationSeconds: formData.durationValue }),
        }

        try {
            const url = editPlanId ? `/api/plans/${editPlanId}` : "/api/plans";
            const method = editPlanId ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setIsModalOpen(false);
                setEditPlanId(null);
                setFormData({ name: "", durationValue: 30, durationType: "days", price: 0, features: "", whatsAppAlert: false, allowQuantity: false, voiceAlert: false, hasEntertainment: false, hasFaceScan: false, quickDelete: false, hasTokenPrint: false });
                fetchPlans();
            } else {
                alert("Failed to create plan");
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Plans Management</h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        Create and edit membership plans (Admin only).
                    </p>
                </div>
                {isAdmin && (
                    <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                        <button
                            onClick={() => {
                                setEditPlanId(null);
                                setFormData({ name: "", durationValue: 30, durationType: "days", price: 0, features: "", whatsAppAlert: false, allowQuantity: false, voiceAlert: false, hasEntertainment: false, hasFaceScan: false, quickDelete: false, hasTokenPrint: false });
                                setIsModalOpen(true);
                            }}
                            type="button"
                            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                            <Plus className="-ml-0.5 mr-1.5 h-5 w-5 inline" aria-hidden="true" />
                            Add Plan
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="text-gray-500">Loading plans...</div>
                ) : plans.length === 0 ? (
                    <div className="text-gray-500">No plans found. Create one to get started.</div>
                ) : (
                    plans.map((plan: any) => (
                        <div
                            key={plan._id}
                            className="relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                        >
                            <div>
                                <h3 className="text-lg font-semibold leading-8 text-gray-900 dark:text-white">
                                    {plan.name}
                                </h3>
                                <p className="mt-4 flex items-baseline gap-x-2">
                                    <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">₹{plan.price}</span>
                                    <span className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-400">
                                        /{plan.durationSeconds ? `${plan.durationSeconds} secs` : 
                                          plan.durationMinutes ? `${plan.durationMinutes} mins` : 
                                          plan.durationHours ? `${plan.durationHours} hrs` : 
                                          `${plan.durationDays} days`}
                                    </span>
                                </p>
                                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                    {plan.features.map((feature: string, idx: number) => (
                                        <li key={idx} className="flex gap-x-3">
                                            <svg className="h-6 w-5 flex-none text-indigo-600 dark:text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-4 flex flex-wrap gap-1.5">
                                    {plan.whatsAppAlert && <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-400">💬 WhatsApp</span>}
                                    {plan.allowQuantity && <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">🔢 Multi-Qty</span>}
                                    {plan.hasEntertainment && <span className="inline-flex items-center rounded-full bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-400">🎭 Entertainment</span>}
                                    {plan.hasFaceScan && <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">📷 Face Scan</span>}
                                    {plan.quickDelete && <span className="inline-flex items-center rounded-full bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">⚡ Quick Delete</span>}
                                    {plan.hasTokenPrint && <span className="inline-flex items-center rounded-full bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 text-xs font-medium text-teal-700 dark:text-teal-400">🖨️ Token Print</span>}
                                </div>
                            </div>
                            {isAdmin && (
                                <div className="mt-6 flex gap-2">
                                    <button
                                        type="button"
                                        className="flex-1 rounded-md bg-indigo-50 px-3 py-2 text-center text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                                        onClick={() => {
                                            setEditPlanId(plan._id);
                                            
                                            // Reverse map duration
                                            let dType = "days";
                                            let dVal = plan.durationDays || 30;
                                            if (plan.durationSeconds) { dType = "seconds"; dVal = plan.durationSeconds; }
                                            else if (plan.durationMinutes) { dType = "minutes"; dVal = plan.durationMinutes; }
                                            else if (plan.durationHours) { dType = "hours"; dVal = plan.durationHours; }

                                            setFormData({
                                                name: plan.name,
                                                price: plan.price,
                                                features: plan.features.join(", "),
                                                durationType: dType,
                                                durationValue: dVal,
                                                whatsAppAlert: plan.whatsAppAlert || false,
                                                allowQuantity: plan.allowQuantity || false,
                                                voiceAlert: plan.voiceAlert || false,
                                                hasEntertainment: plan.hasEntertainment || false,
                                                hasFaceScan: plan.hasFaceScan || false,
                                                quickDelete: plan.quickDelete || false,
                                                hasTokenPrint: plan.hasTokenPrint || false,
                                            });
                                            setIsModalOpen(true);
                                        }}
                                    >
                                        Edit Plan
                                    </button>
                                    <button
                                        type="button"
                                        className="flex-1 rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50 dark:bg-gray-800 dark:ring-red-900 dark:hover:bg-gray-800"
                                        onClick={() => {
                                        if (confirm("Are you sure?")) {
                                            fetch(`/api/plans/${plan._id}`, { method: "DELETE" })
                                                .then(res => {
                                                    if (res.ok) fetchPlans();
                                                    else alert("Failed to delete plan");
                                                })
                                                .catch(err => {
                                                    console.error(err);
                                                    alert("An error occurred");
                                                });
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4 inline mr-2" />
                                    Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900">
                        <h2 className="text-xl font-semibold dark:text-white mb-4">{editPlanId ? "Edit Plan" : "Create Plan"}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Plan Name</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300">Duration Amount</label>
                                    <input required type="number" min="1" value={formData.durationValue} onChange={e => setFormData({ ...formData, durationValue: Number(e.target.value) })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300">Duration Type</label>
                                    <select required value={formData.durationType} onChange={e => setFormData({ ...formData, durationType: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:text-white">
                                        <option value="days">Days</option>
                                        <option value="hours">Hours</option>
                                        <option value="minutes">Minutes</option>
                                        <option value="seconds">Seconds</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium dark:text-gray-300">Price (₹)</label>
                                    <input required type="number" min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Features (comma separated)</label>
                                <input type="text" value={formData.features} onChange={e => setFormData({ ...formData, features: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:text-white" placeholder="e.g. 1 hour, locker access" />
                            </div>
                            <div className="pt-2">
                                <label className="flex items-center space-x-2 text-sm font-medium dark:text-gray-300">
                                    <input type="checkbox" checked={formData.whatsAppAlert} onChange={e => setFormData({ ...formData, whatsAppAlert: e.target.checked })} className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:ring-offset-gray-900" />
                                    <span>WhatsApp Alert (for 2-day expiry and expired)</span>
                                </label>
                            </div>
                            <div className="pt-2">
                                <label className="flex items-center space-x-2 text-sm font-medium dark:text-gray-300">
                                    <input type="checkbox" checked={formData.allowQuantity} onChange={e => setFormData({ ...formData, allowQuantity: e.target.checked })} className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:ring-offset-gray-900" />
                                    <span>Allow Multiple Quantity Purchases (Max 25)</span>
                                </label>
                            </div>
                            <div className="pt-2">
                                <label className="flex items-center space-x-2 text-sm font-medium dark:text-gray-300">
                                    <input type="checkbox" checked={formData.voiceAlert} onChange={e => setFormData({ ...formData, voiceAlert: e.target.checked })} className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:ring-offset-gray-900" />
                                    <span>Voice Alert upon expiration (Announcement via System Speaker)</span>
                                </label>
                            </div>
                            {/* ── Phase 2 Advanced Features ── */}
                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Advanced Features</p>
                                <div className="space-y-2.5">
                                    <label className="flex items-start gap-2 text-sm dark:text-gray-300 cursor-pointer" title="Members under this plan use the MS-series ID (MS0001…)">
                                        <input type="checkbox" checked={formData.hasEntertainment} onChange={e => setFormData({ ...formData, hasEntertainment: e.target.checked })} className="mt-0.5 rounded border-gray-300 text-purple-600 dark:border-gray-600 dark:bg-gray-800" />
                                        <span>🎭 <strong>Entertainment Member</strong> — uses MS-series ID</span>
                                    </label>

                                    <label className="flex items-start gap-2 text-sm dark:text-gray-300 cursor-pointer" title="Auto-purge 1 day after expiry (default is 15 days)">
                                        <input type="checkbox" checked={formData.quickDelete} onChange={e => setFormData({ ...formData, quickDelete: e.target.checked })} className="mt-0.5 rounded border-gray-300 text-orange-600 dark:border-gray-600 dark:bg-gray-800" />
                                        <span>⚡ <strong>Quick Delete</strong> — auto-purge 1 day after expiry</span>
                                    </label>
                                    <label className="flex items-start gap-2 text-sm dark:text-gray-300 cursor-pointer" title="Print 80mm thermal receipt on registration">
                                        <input type="checkbox" checked={formData.hasTokenPrint} onChange={e => setFormData({ ...formData, hasTokenPrint: e.target.checked })} className="mt-0.5 rounded border-gray-300 text-teal-600 dark:border-gray-600 dark:bg-gray-800" />
                                        <span>🖨️ <strong>Token Print</strong> — auto-print 80mm receipt on registration</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={() => {
                                    setIsModalOpen(false);
                                    setEditPlanId(null);
                                    setFormData({ name: "", durationValue: 30, durationType: "days", price: 0, features: "", whatsAppAlert: false, allowQuantity: false, voiceAlert: false, hasEntertainment: false, hasFaceScan: false, quickDelete: false, hasTokenPrint: false });
                                }} className="px-4 py-2 text-sm rounded-md border dark:border-gray-700 dark:text-gray-300">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-500">{editPlanId ? "Update Plan" : "Save Plan"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
