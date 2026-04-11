"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { useSession } from "next-auth/react";

interface PlanMessages {
    beforeExpiry: { text: string; mediaUrl: string };
    afterExpiry:  { text: string; mediaUrl: string };
}

interface Plan {
    _id: string;
    name: string;
    durationDays?: number;
    durationHours?: number;
    durationMinutes?: number;
    durationSeconds?: number;
    price: number;
    features: string[];
    whatsAppAlert?: boolean;
    enableWhatsAppAlerts?: boolean;
    allowQuantity?: boolean;
    voiceAlert?: boolean;
    hasEntertainment?: boolean;
    hasFaceScan?: boolean;
    quickDelete?: boolean;
    hasTokenPrint?: boolean;
    messages?: PlanMessages;
}

const DEFAULT_MESSAGES: PlanMessages = {
    beforeExpiry: {
        text: "⏳ Your membership expires in 2 days. Please renew to continue enjoying the pool!",
        mediaUrl: "",
    },
    afterExpiry: {
        text: "❌ Your membership has expired. Please renew to regain access to the pool!",
        mediaUrl: "",
    },
};

const DEFAULT_FORM = {
    name: "",
    durationValue: 30,
    durationType: "days",
    price: 0,
    features: "",
    whatsAppAlert: false,
    enableWhatsAppAlerts: false,
    allowQuantity: false,
    voiceAlert: false,
    hasEntertainment: false,
    hasFaceScan: false,
    quickDelete: false,
    hasTokenPrint: false,
    messages: DEFAULT_MESSAGES,
};

export default function PlansPage() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "admin";

    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editPlanId, setEditPlanId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ ...DEFAULT_FORM });
    const [showMsgSection, setShowMsgSection] = useState(false);

    const fetchPlans = () => {
        setLoading(true);
        fetch("/api/plans?limit=100", { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                const planList = Array.isArray(data) ? data : (data.data ?? []);
                setPlans(planList);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchPlans(); }, []);

    const openCreate = () => {
        setEditPlanId(null);
        setFormData({ ...DEFAULT_FORM, messages: DEFAULT_MESSAGES });
        setShowMsgSection(false);
        setIsModalOpen(true);
    };

    const openEdit = (plan: Plan) => {
        let dType = "days";
        let dVal = plan.durationDays || 30;
        if (plan.durationSeconds) { dType = "seconds"; dVal = plan.durationSeconds; }
        else if (plan.durationMinutes) { dType = "minutes"; dVal = plan.durationMinutes; }
        else if (plan.durationHours) { dType = "hours"; dVal = plan.durationHours; }

        const alertsEnabled = plan.enableWhatsAppAlerts ?? plan.whatsAppAlert ?? false;

        setEditPlanId(plan._id);
        setFormData({
            name: plan.name,
            price: plan.price,
            features: plan.features.join(", "),
            durationType: dType,
            durationValue: dVal,
            whatsAppAlert: alertsEnabled,
            enableWhatsAppAlerts: alertsEnabled,
            allowQuantity: plan.allowQuantity || false,
            voiceAlert: plan.voiceAlert || false,
            hasEntertainment: plan.hasEntertainment || false,
            hasFaceScan: plan.hasFaceScan || false,
            quickDelete: plan.quickDelete || false,
            hasTokenPrint: plan.hasTokenPrint || false,
            messages: {
                beforeExpiry: {
                    text: plan.messages?.beforeExpiry?.text || DEFAULT_MESSAGES.beforeExpiry.text,
                    mediaUrl: plan.messages?.beforeExpiry?.mediaUrl || "",
                },
                afterExpiry: {
                    text: plan.messages?.afterExpiry?.text || DEFAULT_MESSAGES.afterExpiry.text,
                    mediaUrl: plan.messages?.afterExpiry?.mediaUrl || "",
                },
            },
        });
        setShowMsgSection(alertsEnabled);
        setIsModalOpen(true);
    };

    const handleAlertToggle = (checked: boolean) => {
        setFormData(prev => ({ ...prev, whatsAppAlert: checked, enableWhatsAppAlerts: checked }));
        setShowMsgSection(checked);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanFeatures = formData.features.split(",").map(f => f.trim()).filter(Boolean);

        const payload: any = {
            name: formData.name,
            price: formData.price,
            features: cleanFeatures,
            whatsAppAlert: formData.enableWhatsAppAlerts,
            enableWhatsAppAlerts: formData.enableWhatsAppAlerts,
            allowQuantity: formData.allowQuantity,
            voiceAlert: formData.voiceAlert,
            hasEntertainment: formData.hasEntertainment,
            hasFaceScan: formData.hasFaceScan,
            quickDelete: formData.quickDelete,
            hasTokenPrint: formData.hasTokenPrint,
            ...(formData.durationType === "days"    ? { durationDays: formData.durationValue }
              : formData.durationType === "hours"   ? { durationHours: formData.durationValue }
              : formData.durationType === "minutes" ? { durationMinutes: formData.durationValue }
              : { durationSeconds: formData.durationValue }),
        };

        // Include messages only if WhatsApp alerts enabled
        if (formData.enableWhatsAppAlerts) {
            payload.messages = {
                beforeExpiry: {
                    text: formData.messages.beforeExpiry.text,
                    mediaUrl: formData.messages.beforeExpiry.mediaUrl || null,
                },
                afterExpiry: {
                    text: formData.messages.afterExpiry.text,
                    mediaUrl: formData.messages.afterExpiry.mediaUrl || null,
                },
            };
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
                fetchPlans();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to save plan");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const inputCls = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg dark:border-gray-600 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";
    const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300";
    const checkCls = "rounded border-gray-300 text-blue-600 dark:text-blue-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg dark:ring-offset-gray-900";

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Plans Management</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Create and manage membership plans with WhatsApp alert messages.
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={openCreate}
                        type="button"
                        className="mt-4 sm:mt-0 flex items-center gap-1.5 rounded-md bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-50 dark:hover:bg-blue-500/100 transition"
                    >
                        <Plus className="h-4 w-4" />
                        Add Plan
                    </button>
                )}
            </div>

            {/* ── Plan Cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="text-gray-500 text-sm">Loading plans…</div>
                ) : plans.length === 0 ? (
                    <div className="text-gray-500 text-sm">No plans found. Create one to get started.</div>
                ) : (
                    plans.map((plan: any) => (
                        <div
                            key={plan._id}
                            className="relative flex flex-col justify-between rounded-2xl border border-gray-200 p-6 shadow-sm dark:border-gray-800 bg-background"
                        >
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                                <p className="mt-3 flex items-baseline gap-x-2">
                                    <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">₹{plan.price}</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        /{plan.durationSeconds ? `${plan.durationSeconds}s`
                                          : plan.durationMinutes ? `${plan.durationMinutes}m`
                                          : plan.durationHours ? `${plan.durationHours}h`
                                          : `${plan.durationDays}d`}
                                    </span>
                                </p>

                                <ul className="mt-4 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                                    {plan.features.map((f: string, i: number) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <svg className="h-4 w-4 text-blue-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                            </svg>
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-4 flex flex-wrap gap-1.5">
                                    {(plan.enableWhatsAppAlerts || plan.whatsAppAlert) && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                            <MessageSquare className="h-3 w-3" /> WhatsApp
                                        </span>
                                    )}
                                    {plan.allowQuantity && <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">🔢 Multi-Qty</span>}
                                    {plan.hasEntertainment && <span className="inline-flex items-center rounded-full bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-400">🎭 Entertainment</span>}
                                    {plan.hasFaceScan && <span className="inline-flex items-center rounded-full bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-400">📷 Face Scan</span>}
                                    {plan.quickDelete && <span className="inline-flex items-center rounded-full bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">⚡ Quick Delete</span>}
                                    {plan.hasTokenPrint && <span className="inline-flex items-center rounded-full bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 text-xs font-medium text-teal-700 dark:text-teal-400">🖨️ Token Print</span>}
                                </div>

                                {/* WhatsApp message preview */}
                                {(plan.enableWhatsAppAlerts || plan.whatsAppAlert) && plan.messages && (
                                    <div className="mt-4 rounded-lg border border-green-100 dark:border-green-900/40 bg-green-50/50 dark:bg-green-900/10 p-3 space-y-2">
                                        <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">📋 Alert Messages</p>
                                        <div>
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Before expiry: </span>
                                            <span className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{plan.messages.beforeExpiry?.text}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">After expiry: </span>
                                            <span className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{plan.messages.afterExpiry?.text}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {isAdmin && (
                                <div className="mt-5 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openEdit(plan)}
                                        className="flex-1 rounded-md bg-indigo-50 px-3 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (confirm("Delete this plan?")) {
                                                fetch(`/api/plans/${plan._id}`, { method: "DELETE" })
                                                    .then(res => { if (res.ok) fetchPlans(); else alert("Failed to delete"); })
                                                    .catch(console.error);
                                            }
                                        }}
                                        className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 ring-1 ring-inset ring-red-300 hover:bg-red-50 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg dark:ring-red-900 dark:hover:bg-gray-700 transition"
                                    >
                                        <Trash2 className="h-4 w-4 inline mr-1.5" />
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* ── Modal ──────────────────────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-background shadow-2xl flex flex-col max-h-[90vh]">

                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-xl font-semibold dark:text-white">
                                {editPlanId ? "Edit Plan" : "Create Plan"}
                            </h2>
                        </div>

                        {/* Scrollable Body */}
                        <div className="overflow-y-auto flex-1 px-6 py-5">
                            <form id="plan-form" onSubmit={handleSubmit} className="space-y-4">

                                {/* Name */}
                                <div>
                                    <label className={labelCls}>Plan Name</label>
                                    <input required type="text" value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className={inputCls} placeholder="e.g. Monthly Standard" />
                                </div>

                                {/* Duration */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelCls}>Duration Amount</label>
                                        <input required type="number" min="1" value={formData.durationValue}
                                            onChange={e => setFormData({ ...formData, durationValue: Number(e.target.value) })}
                                            className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Unit</label>
                                        <select value={formData.durationType}
                                            onChange={e => setFormData({ ...formData, durationType: e.target.value })}
                                            className={inputCls}>
                                            <option value="days">Days</option>
                                            <option value="hours">Hours</option>
                                            <option value="minutes">Minutes</option>
                                            <option value="seconds">Seconds</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Price */}
                                <div>
                                    <label className={labelCls}>Price (₹)</label>
                                    <input required type="number" min="0" value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                        className={inputCls} />
                                </div>

                                {/* Features */}
                                <div>
                                    <label className={labelCls}>Features (comma-separated)</label>
                                    <input type="text" value={formData.features}
                                        onChange={e => setFormData({ ...formData, features: e.target.value })}
                                        placeholder="e.g. 1 hour, locker access"
                                        className={inputCls} />
                                </div>

                                {/* ── WhatsApp Alerts Toggle ────────────────────────── */}
                                <div className="pt-1">
                                    <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                        <input
                                            type="checkbox"
                                            checked={formData.enableWhatsAppAlerts}
                                            onChange={e => handleAlertToggle(e.target.checked)}
                                            className={`mt-0.5 ${checkCls}`}
                                        />
                                        <div>
                                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                                <MessageSquare className="h-4 w-4 text-green-500" />
                                                Enable WhatsApp Alerts
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                Auto-send messages 2 days before expiry and when expired.
                                            </span>
                                        </div>
                                    </label>
                                </div>

                                {/* ── WhatsApp Message Config (collapsible) ─────────── */}
                                {formData.enableWhatsAppAlerts && (
                                    <div className="rounded-xl border border-green-200 dark:border-green-800/60 bg-green-50/50 dark:bg-green-900/10 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setShowMsgSection(v => !v)}
                                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-green-800 dark:text-green-300 hover:bg-green-100/50 dark:hover:bg-green-900/20 transition"
                                        >
                                            <span>💬 Customize Messages</span>
                                            {showMsgSection
                                                ? <ChevronUp className="h-4 w-4" />
                                                : <ChevronDown className="h-4 w-4" />}
                                        </button>

                                        {showMsgSection && (
                                            <div className="border-t border-green-200 dark:border-green-800/60 px-4 py-4 space-y-5">

                                                {/* Before Expiry */}
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">⏳ Before Expiry (2 days)</p>
                                                    <div>
                                                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Message Text</label>
                                                        <textarea
                                                            rows={3}
                                                            value={formData.messages.beforeExpiry.text}
                                                            onChange={e => setFormData(prev => ({
                                                                ...prev,
                                                                messages: {
                                                                    ...prev.messages,
                                                                    beforeExpiry: { ...prev.messages.beforeExpiry, text: e.target.value }
                                                                }
                                                            }))}
                                                            className={`${inputCls} resize-none`}
                                                            placeholder="Message sent 2 days before expiry…"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Media URL <span className="text-gray-400">(optional — image/video link)</span></label>
                                                        <input
                                                            type="url"
                                                            value={formData.messages.beforeExpiry.mediaUrl}
                                                            onChange={e => setFormData(prev => ({
                                                                ...prev,
                                                                messages: {
                                                                    ...prev.messages,
                                                                    beforeExpiry: { ...prev.messages.beforeExpiry, mediaUrl: e.target.value }
                                                                }
                                                            }))}
                                                            className={inputCls}
                                                            placeholder="https://example.com/banner.jpg"
                                                        />
                                                    </div>
                                                </div>

                                                {/* After Expiry */}
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">❌ After Expiry</p>
                                                    <div>
                                                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Message Text</label>
                                                        <textarea
                                                            rows={3}
                                                            value={formData.messages.afterExpiry.text}
                                                            onChange={e => setFormData(prev => ({
                                                                ...prev,
                                                                messages: {
                                                                    ...prev.messages,
                                                                    afterExpiry: { ...prev.messages.afterExpiry, text: e.target.value }
                                                                }
                                                            }))}
                                                            className={`${inputCls} resize-none`}
                                                            placeholder="Message sent when membership expires…"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Media URL <span className="text-gray-400">(optional)</span></label>
                                                        <input
                                                            type="url"
                                                            value={formData.messages.afterExpiry.mediaUrl}
                                                            onChange={e => setFormData(prev => ({
                                                                ...prev,
                                                                messages: {
                                                                    ...prev.messages,
                                                                    afterExpiry: { ...prev.messages.afterExpiry, mediaUrl: e.target.value }
                                                                }
                                                            }))}
                                                            className={inputCls}
                                                            placeholder="https://example.com/renew.jpg"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Other flags ───────────────────────────────────── */}
                                <div className="pt-1 space-y-2">
                                    {[
                                        { key: "allowQuantity", label: "🔢 Allow Multiple Quantity Purchases (Max 25)" },
                                        { key: "voiceAlert",    label: "🔊 Voice Alert upon expiration (System Speaker)" },
                                    ].map(({ key, label }) => (
                                        <label key={key} className="flex items-center gap-2 text-sm dark:text-gray-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={(formData as any)[key]}
                                                onChange={e => setFormData({ ...formData, [key]: e.target.checked })}
                                                className={checkCls}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>

                                {/* Advanced */}
                                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Advanced Features</p>
                                    <div className="space-y-2">
                                        {[
                                            { key: "hasEntertainment", label: "🎭 Entertainment Member — uses MS-series ID" },
                                            { key: "quickDelete",      label: "⚡ Quick Delete — auto-purge 1 day after expiry" },
                                            { key: "hasTokenPrint",    label: "🖨️ Token Print — auto-print 80mm receipt on registration" },
                                        ].map(({ key, label }) => (
                                            <label key={key} className="flex items-start gap-2 text-sm dark:text-gray-300 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={(formData as any)[key]}
                                                    onChange={e => setFormData({ ...formData, [key]: e.target.checked })}
                                                    className={`mt-0.5 ${checkCls}`}
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => { setIsModalOpen(false); setEditPlanId(null); }}
                                className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="plan-form"
                                className="px-5 py-2 text-sm rounded-md bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 text-white font-semibold hover:bg-blue-50 dark:hover:bg-blue-500/100 transition"
                            >
                                {editPlanId ? "Update Plan" : "Save Plan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
