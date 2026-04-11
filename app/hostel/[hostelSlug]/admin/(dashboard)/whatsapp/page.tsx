"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Wifi, WifiOff, Unplug, CheckCircle, AlertCircle } from "lucide-react";

const INPUT = "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const LABEL = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1";

export default function WhatsAppPage() {
    const [status, setStatus] = useState<{ connected: boolean; whatsappNumber: string | null; sid: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ sid: "", authToken: "", whatsappNumber: "", testPhone: "" });
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const fetchStatus = async () => { setLoading(true); const r = await fetch("/api/hostel/twilio/status", { cache: 'no-store' }); const d = await r.json(); setStatus(d); setLoading(false); };
    useEffect(() => { fetchStatus(); }, []);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault(); setConnecting(true); setMessage(null);
        const res = await fetch("/api/hostel/twilio/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const data = await res.json();
        if (!res.ok) { setMessage({ type: "error", text: data.error + (data.detail ? ` — ${data.detail}` : "") }); }
        else { setMessage({ type: "success", text: data.message }); fetchStatus(); setForm({ sid: "", authToken: "", whatsappNumber: "", testPhone: "" }); }
        setConnecting(false);
    };

    const handleDisconnect = async () => {
        if (!confirm("Disconnect WhatsApp? Alerts will stop.")) return;
        setDisconnecting(true); setMessage(null);
        const res = await fetch("/api/hostel/twilio/disconnect", { method: "POST" });
        const data = await res.json();
        if (!res.ok) setMessage({ type: "error", text: data.error });
        else { setMessage({ type: "success", text: data.message }); fetchStatus(); }
        setDisconnecting(false);
    };

    if (loading) return <div className="py-16 text-center text-slate-400">Loading…</div>;

    return (
        <div className="space-y-8 max-w-2xl">
            <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><MessageSquare className="h-6 w-6 text-emerald-500"/>WhatsApp Integration</h1>
            <p className="text-sm text-slate-500">Connect Twilio to send automated expiry alerts to hostel members</p></div>

            {/* Status Card */}
            <div className={`rounded-2xl border p-6 flex items-center gap-4 ${status?.connected ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
                {status?.connected ? <Wifi className="h-8 w-8 text-emerald-500 flex-shrink-0"/> : <WifiOff className="h-8 w-8 text-slate-400 flex-shrink-0"/>}
                <div className="flex-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{status?.connected ? "WhatsApp Connected" : "Not Connected"}</p>
                    {status?.connected && <p className="text-sm text-slate-500 mt-0.5">Number: <span className="font-mono text-emerald-600">{status.whatsappNumber}</span></p>}
                    {!status?.connected && <p className="text-sm text-slate-500">Fill in the form below to connect your Twilio account</p>}
                </div>
                {status?.connected && (
                    <button onClick={handleDisconnect} disabled={disconnecting} className="flex items-center gap-1.5 text-sm border border-red-200 dark:border-red-900/40 text-red-500 px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50">
                        <Unplug className="h-4 w-4"/>{disconnecting ? "Disconnecting…" : "Disconnect"}
                    </button>
                )}
            </div>

            {message && (
                <div className={`flex items-start gap-3 rounded-xl p-4 border ${message.type === "success" ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/10 border-red-200 text-red-700 dark:text-red-400"}`}>
                    {message.type === "success" ? <CheckCircle className="h-5 w-5 flex-shrink-0"/> : <AlertCircle className="h-5 w-5 flex-shrink-0"/>}
                    <p className="text-sm">{message.text}</p>
                </div>
            )}

            {/* Connection Form */}
            {!status?.connected && (
                <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">Connect Twilio Account</h2>
                    <form onSubmit={handleConnect} className="space-y-4">
                        <div><label className={LABEL}>Twilio Account SID</label><input required value={form.sid} onChange={e=>setForm(p=>({...p,sid:e.target.value}))} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className={INPUT}/></div>
                        <div><label className={LABEL}>Auth Token</label><input required type="password" value={form.authToken} onChange={e=>setForm(p=>({...p,authToken:e.target.value}))} className={INPUT}/></div>
                        <div><label className={LABEL}>WhatsApp Number (e.g. +14155238886)</label><input required value={form.whatsappNumber} onChange={e=>setForm(p=>({...p,whatsappNumber:e.target.value}))} placeholder="+14155238886" className={INPUT}/></div>
                        <div><label className={LABEL}>Test Phone Number (Indian, e.g. 9876543210)</label><input required value={form.testPhone} onChange={e=>setForm(p=>({...p,testPhone:e.target.value}))} placeholder="9876543210" className={INPUT}/></div>
                        <p className="text-xs text-slate-400">A test WhatsApp message will be sent to verify your credentials before saving.</p>
                        <button type="submit" disabled={connecting} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl shadow transition disabled:opacity-50">
                            <Wifi className="h-4 w-4"/>{connecting ? "Connecting…" : "Connect WhatsApp"}
                        </button>
                    </form>
                </div>
            )}

            {/* How it works */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">How it works</h3>
                <ol className="space-y-2 text-sm text-slate-500 list-decimal list-inside">
                    <li>Connect your Twilio WhatsApp-enabled number above</li>
                    <li>Enable WhatsApp on your hostel plans</li>
                    <li>The system automatically sends expiry reminders 3 days before</li>
                    <li>Messages use a customizable template (set in Hostel Settings)</li>
                </ol>
            </div>
        </div>
    );
}
