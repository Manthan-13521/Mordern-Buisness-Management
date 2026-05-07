"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight, MessageSquare, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

interface PlanMessages {
    beforeExpiry: { text: string; mediaUrl: string };
    afterExpiry:  { text: string; mediaUrl: string };
}

type Plan = { 
    _id: string; 
    name: string; 
    durationDays: number; 
    price: number; 
    description?: string; 
    enableWhatsAppAlerts?: boolean; 
    enableWhatsApp?: boolean; // compat
    messages?: PlanMessages;
    isActive: boolean; 
};

const INPUT = "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";
const LABEL = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide";

const DEFAULT_MESSAGES: PlanMessages = {
    beforeExpiry: {
        text: "⏳ Your hostel membership expires in 2 days. Please renew to continue your stay!",
        mediaUrl: "",
    },
    afterExpiry: {
        text: "❌ Your hostel membership has expired. Please renew to continue your stay!",
        mediaUrl: "",
    },
};

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editPlan, setEditPlan] = useState<Plan | null>(null);
    const [form, setForm] = useState({ 
        name: "", 
        durationDays: "", 
        price: "", 
        description: "", 
        enableWhatsApp: false, 
        messages: DEFAULT_MESSAGES,
        isActive: true 
    });
    const [showMsgSection, setShowMsgSection] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const fetchPlans = async () => { setLoading(true); const r = await fetch("/api/hostel/plans", { cache: 'no-store' }); const d = await r.json(); setPlans(d.data || []); setLoading(false); };
    useEffect(() => { fetchPlans(); }, []);

    const openAdd = () => { 
        setEditPlan(null); 
        setForm({ name: "", durationDays: "", price: "", description: "", enableWhatsApp: false, messages: DEFAULT_MESSAGES, isActive: true }); 
        setError(""); 
        setShowMsgSection(false);
        setShowForm(true); 
    };
    const openEdit = (p: Plan) => { 
        const alertsEnabled = p.enableWhatsAppAlerts ?? p.enableWhatsApp ?? false;
        setEditPlan(p); 
        setForm({ 
            name: p.name, 
            durationDays: String(p.durationDays), 
            price: String(p.price), 
            description: p.description || "", 
            enableWhatsApp: alertsEnabled, 
            messages: {
                beforeExpiry: {
                    text: p.messages?.beforeExpiry?.text || DEFAULT_MESSAGES.beforeExpiry.text,
                    mediaUrl: p.messages?.beforeExpiry?.mediaUrl || "",
                },
                afterExpiry: {
                    text: p.messages?.afterExpiry?.text || DEFAULT_MESSAGES.afterExpiry.text,
                    mediaUrl: p.messages?.afterExpiry?.mediaUrl || "",
                },
            },
            isActive: p.isActive 
        }); 
        setError(""); 
        setShowMsgSection(alertsEnabled);
        setShowForm(true); 
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSubmitting(true); setError("");
        const url = editPlan ? `/api/hostel/plans/${editPlan._id}` : "/api/hostel/plans";
        const method = editPlan ? "PUT" : "POST";
        
        const payload: any = {
            ...form,
            enableWhatsAppAlerts: form.enableWhatsApp,
            durationDays: Number(form.durationDays),
            price: Number(form.price),
        };

        if (form.enableWhatsApp) {
            payload.messages = form.messages;
        }

        const res = await fetch(url, { 
            method, 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(payload) 
        });
        const data = await res.json();
        if (!res.ok) { setError(typeof data.error === "string" ? data.error : (data.error?.message || JSON.stringify(data.error) || "Failed")); setSubmitting(false); return; }
        setShowForm(false); fetchPlans(); setSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this plan?")) return;
        await fetch(`/api/hostel/plans/${id}`, { method: "DELETE" });
        fetchPlans();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><ClipboardList className="h-6 w-6 text-violet-500"/>Plans</h1>
                <p className="text-sm text-slate-500">{plans.length} plans configured</p></div>
                <button onClick={openAdd} className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 hover:bg-blue-50 dark:hover:bg-blue-500/100 text-white text-sm font-medium px-4 py-2 rounded-xl shadow transition"><Plus className="h-4 w-4"/>Add Plan</button>
            </div>

            {loading ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:3}).map((_,i)=><div key={i} className="h-36 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"/>)}</div>
            : plans.length === 0 ? <div className="py-16 text-center text-slate-400">No plans yet — add one to get started</div>
            : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plans.map(p => (
                        <div key={p._id} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-white">{p.name}</h3>
                                    {p.description && <p className="text-xs text-slate-400 mt-0.5">{p.description}</p>}
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.isActive ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-slate-100 dark:bg-slate-700 text-slate-400"}`}>
                                    {p.isActive ? "Active" : "Inactive"}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                                <div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400 dark:text-indigo-400">₹{p.price.toLocaleString("en-IN")}</p>
                                <p className="text-xs text-slate-400">{p.durationDays} days</p></div>
                            </div>
                            {(p.enableWhatsAppAlerts || p.enableWhatsApp) && (
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                        <MessageSquare className="h-3 w-3" /> WhatsApp Alerts Enabled
                                    </div>
                                    {p.messages && (
                                        <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/40 p-2 space-y-1">
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1"><span className="font-semibold">Before 2d:</span> {p.messages.beforeExpiry.text}</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1"><span className="font-semibold">After:</span> {p.messages.afterExpiry.text}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="flex gap-2 pt-1">
                                <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1 text-xs border border-slate-200 dark:border-slate-600 rounded-xl py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"><Pencil className="h-3 w-3"/>Edit</button>
                                <button onClick={() => handleDelete(p._id)} className="flex items-center justify-center gap-1 text-xs border border-red-200 dark:border-red-900/40 rounded-xl px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition"><Trash2 className="h-3 w-3"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setShowForm(false)}/>
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{editPlan?"Edit Plan":"New Plan"}</h2>
                            <button onClick={()=>setShowForm(false)}><X className="h-5 w-5 text-slate-400"/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
                            <div><label className={LABEL}>Plan Name</label><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className={INPUT} placeholder="e.g. Monthly Bed"/></div>
                            <div><label className={LABEL}>Duration (days)</label><input type="number" min="1" required value={form.durationDays} onChange={e=>setForm(p=>({...p,durationDays:e.target.value}))} className={INPUT} placeholder="30"/></div>
                            <div><label className={LABEL}>Price (₹)</label><input type="number" min="0" required value={form.price} onChange={e=>setForm(p=>({...p,price:e.target.value}))} className={INPUT} placeholder="5000"/></div>
                            <div><label className={LABEL}>Description (optional)</label><textarea rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className={INPUT}/></div>
                            
                            {/* WhatsApp section */}
                            <div className="pt-1">
                                <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                                    <input
                                        type="checkbox"
                                        checked={form.enableWhatsApp}
                                        onChange={e => {
                                            setForm(p => ({ ...p, enableWhatsApp: e.target.checked }));
                                            setShowMsgSection(e.target.checked);
                                        }}
                                        className="mt-1 rounded border-slate-300 text-blue-600 dark:text-blue-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
                                    />
                                    <div>
                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                            <MessageSquare className="h-4 w-4 text-emerald-500" />
                                            Enable WhatsApp Alerts
                                        </span>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                            Auto-send messages before expiry and when expired.
                                        </span>
                                    </div>
                                </label>
                            </div>

                            {form.enableWhatsApp && (
                                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-900/10 overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setShowMsgSection(v => !v)}
                                        className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition uppercase tracking-wider"
                                    >
                                        <span className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5" /> Customize Messages</span>
                                        {showMsgSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </button>

                                    {showMsgSection && (
                                        <div className="border-t border-emerald-200 dark:border-emerald-800/60 px-4 py-4 space-y-4">
                                            {/* Before Expiry */}
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                                                    ⏳ Before Expiry (2 days)
                                                </p>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 mb-1 block">Message Text</label>
                                                    <textarea
                                                        rows={2}
                                                        value={form.messages.beforeExpiry.text}
                                                        onChange={e => setForm(prev => ({
                                                            ...prev,
                                                            messages: { ...prev.messages, beforeExpiry: { ...prev.messages.beforeExpiry, text: e.target.value } }
                                                        }))}
                                                        className={`${INPUT} text-xs resize-none`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 mb-1 block">Media URL (optional)</label>
                                                    <input
                                                        type="url"
                                                        value={form.messages.beforeExpiry.mediaUrl}
                                                        onChange={e => setForm(prev => ({
                                                            ...prev,
                                                            messages: { ...prev.messages, beforeExpiry: { ...prev.messages.beforeExpiry, mediaUrl: e.target.value } }
                                                        }))}
                                                        className={`${INPUT} text-xs`}
                                                        placeholder="https://example.com/banner.jpg"
                                                    />
                                                </div>
                                            </div>

                                            {/* After Expiry */}
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                                                    ❌ After Expiry
                                                </p>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 mb-1 block">Message Text</label>
                                                    <textarea
                                                        rows={2}
                                                        value={form.messages.afterExpiry.text}
                                                        onChange={e => setForm(prev => ({
                                                            ...prev,
                                                            messages: { ...prev.messages, afterExpiry: { ...prev.messages.afterExpiry, text: e.target.value } }
                                                        }))}
                                                        className={`${INPUT} text-xs resize-none`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 mb-1 block">Media URL (optional)</label>
                                                    <input
                                                        type="url"
                                                        value={form.messages.afterExpiry.mediaUrl}
                                                        onChange={e => setForm(prev => ({
                                                            ...prev,
                                                            messages: { ...prev.messages, afterExpiry: { ...prev.messages.afterExpiry, mediaUrl: e.target.value } }
                                                        }))}
                                                        className={`${INPUT} text-xs`}
                                                        placeholder="https://example.com/renew.jpg"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {editPlan && <div className="flex items-center justify-between pt-1"><label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Active Status</label>
                                <button type="button" onClick={()=>setForm(p=>({...p,isActive:!p.isActive}))} className="text-emerald-600">
                                    {form.isActive ? <ToggleRight className="h-7 w-7"/> : <ToggleLeft className="h-7 w-7 text-slate-400"/>}
                                </button></div>}
                            <div className="pt-2">
                                <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 hover:bg-blue-50 dark:hover:bg-blue-500/100 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                    {submitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                                    {submitting ? "Saving Plan..." : editPlan ? "Update Plan" : "Create Plan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
