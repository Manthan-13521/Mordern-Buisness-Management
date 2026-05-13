"use client";

import { useState, useEffect } from "react";
import {
    CheckCircle, XCircle, Loader2, Wifi, WifiOff,
    Eye, EyeOff, PhoneCall, Trash2, MessageSquare, Shield
} from "lucide-react";

interface TwilioStatus {
    isTwilioConnected: boolean;
    sid: string | null;
    whatsappNumber: string | null;
}

export default function TwilioSetupPage() {
    const [status, setStatus] = useState<TwilioStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    const [form, setForm] = useState({
        sid: "",
        authToken: "",
        whatsappNumber: "",
        testPhone: "",
    });

    const showToast = (type: "success" | "error", msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 5000);
    };

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/twilio/status", { cache: 'no-store' });
            if (res.ok) setStatus(await res.json());
        } catch {
            // silently ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStatus(); }, []);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.sid || !form.authToken || !form.whatsappNumber || !form.testPhone) {
            showToast("error", "All fields are required.");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/twilio/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (res.ok) {
                showToast("success", data.message || "Twilio connected!");
                setForm({ sid: "", authToken: "", whatsappNumber: "", testPhone: "" });
                await fetchStatus();
            } else {
                showToast("error", data.error + (data.detail ? ` — ${data.detail}` : ""));
            }
        } catch {
            showToast("error", "Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm("Are you sure you want to disconnect Twilio? WhatsApp alerts will stop immediately.")) return;
        setDisconnecting(true);
        try {
            const res = await fetch("/api/twilio/disconnect", { method: "DELETE" });
            const data = await res.json();
            if (res.ok) {
                showToast("success", data.message);
                await fetchStatus();
            } else {
                showToast("error", data.error || "Failed to disconnect.");
            }
        } catch {
            showToast("error", "Network error. Please try again.");
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto">

            {/* ── Toast ─────────────────────────────────────────────────── */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl px-5 py-4 shadow-2xl text-sm font-medium transition-all
                    ${toast.type === "success"
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 text-white"
                    }`}>
                    {toast.type === "success"
                        ? <CheckCircle className="h-5 w-5 shrink-0" />
                        : <XCircle className="h-5 w-5 shrink-0" />}
                    {toast.msg}
                </div>
            )}

            {/* ── Header ────────────────────────────────────────────────── */}
            <div>
                <h1 className="text-2xl font-bold text-[#f9fafb] flex items-center gap-2">
                    <MessageSquare className="h-7 w-7 text-green-500" />
                    WhatsApp Alerts Setup
                </h1>
                <p className="mt-1 text-sm text-[#9ca3af]">
                    Connect your Twilio account to automatically send WhatsApp alerts to members before and after their membership expires.
                </p>
            </div>

            {/* ── Status Card ───────────────────────────────────────────── */}
            <div className={`rounded-2xl border p-6 flex items-center justify-between transition-all
                ${loading ? "border-[#1f2937] bg-[#020617] bg-[#0b1220]"
                : status?.isTwilioConnected
                    ? "border-emerald-700 bg-emerald-900/20"
                    : "border-[#1f2937] bg-[#020617] bg-[#0b1220]"
                }`}>
                {loading ? (
                    <div className="flex items-center gap-3 text-[#6b7280]">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Checking connection...</span>
                    </div>
                ) : status?.isTwilioConnected ? (
                    <>
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-emerald-900/50 p-2">
                                <Wifi className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-emerald-300 text-sm">Connected</p>
                                <p className="text-xs text-emerald-500 mt-0.5">
                                    {status.whatsappNumber} · SID: {status.sid?.slice(0, 12)}…
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleDisconnect}
                            disabled={disconnecting}
                            className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 transition disabled:opacity-50"
                        >
                            {disconnecting
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Trash2 className="h-4 w-4" />}
                            Disconnect
                        </button>
                    </>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-gray-200 p-2">
                            <WifiOff className="h-5 w-5 text-[#9ca3af]" />
                        </div>
                        <div>
                            <p className="font-semibold text-[#9ca3af] text-sm">Not Connected</p>
                            <p className="text-xs text-[#6b7280] mt-0.5">Fill the form below to connect your Twilio account</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Connect Form ──────────────────────────────────────────── */}
            <div className="rounded-2xl border border-[#1f2937] bg-[#0b1220] p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#f9fafb] mb-1">
                    {status?.isTwilioConnected ? "Update Credentials" : "Connect Twilio Account"}
                </h2>
                <p className="text-xs text-[#9ca3af] mb-6">
                    A test message will be sent to your phone before credentials are saved.
                </p>

                <form onSubmit={handleConnect} className="space-y-5">
                    {/* SID */}
                    <div>
                        <label className="block text-sm font-medium text-[#9ca3af] mb-1.5">
                            Account SID
                        </label>
                        <input
                            id="twilio-sid"
                            type="text"
                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            value={form.sid}
                            onChange={e => setForm({ ...form, sid: e.target.value })}
                            className="w-full rounded-lg border border-[#1f2937] border-[#1f2937] bg-[#0b1220] shadow-sm px-4 py-2.5 text-sm text-[#f9fafb] placeholder-gray-400 focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20 outline-none transition"
                        />
                    </div>

                    {/* Auth Token */}
                    <div>
                        <label className="block text-sm font-medium text-[#9ca3af] mb-1.5">
                            Auth Token
                        </label>
                        <div className="relative">
                            <input
                                id="twilio-auth-token"
                                type={showToken ? "text" : "password"}
                                placeholder="Your Twilio auth token"
                                value={form.authToken}
                                onChange={e => setForm({ ...form, authToken: e.target.value })}
                                className="w-full rounded-lg border border-[#1f2937] border-[#1f2937] bg-[#0b1220] shadow-sm px-4 py-2.5 pr-11 text-sm text-[#f9fafb] placeholder-gray-400 focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20 outline-none transition"
                            />
                            <button
                                type="button"
                                onClick={() => setShowToken(!showToken)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#9ca3af]"
                            >
                                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9ca3af]">
                            <Shield className="h-3 w-3" />
                            Encrypted with AES-256-GCM before storage. Never exposed in API responses.
                        </p>
                    </div>

                    {/* WhatsApp Number */}
                    <div>
                        <label className="block text-sm font-medium text-[#9ca3af] mb-1.5">
                            WhatsApp From Number
                        </label>
                        <input
                            id="twilio-whatsapp-number"
                            type="text"
                            placeholder="whatsapp:+14155238886"
                            value={form.whatsappNumber}
                            onChange={e => setForm({ ...form, whatsappNumber: e.target.value })}
                            className="w-full rounded-lg border border-[#1f2937] border-[#1f2937] bg-[#0b1220] shadow-sm px-4 py-2.5 text-sm text-[#f9fafb] placeholder-gray-400 focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20 outline-none transition"
                        />
                        <p className="mt-1 text-xs text-[#6b7280]">Format: <code className="bg-[#0b1220] border border-[#1f2937] border-[#1f2937] shadow-sm px-1 rounded">whatsapp:+14155238886</code> or just <code className="bg-[#0b1220] border border-[#1f2937] border-[#1f2937] shadow-sm px-1 rounded">+14155238886</code></p>
                    </div>

                    {/* Test Phone */}
                    <div>
                        <label className="block text-sm font-medium text-[#9ca3af] mb-1.5">
                            Test Phone Number <span className="text-[#6b7280] font-normal">(receives the verification message)</span>
                        </label>
                        <div className="relative">
                            <PhoneCall className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
                            <input
                                id="twilio-test-phone"
                                type="tel"
                                placeholder="9876543210"
                                value={form.testPhone}
                                onChange={e => setForm({ ...form, testPhone: e.target.value })}
                                className="w-full rounded-lg border border-[#1f2937] border-[#1f2937] bg-[#0b1220] shadow-sm pl-10 pr-4 py-2.5 text-sm text-[#f9fafb] placeholder-gray-400 focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20 outline-none transition"
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        id="twilio-save-btn"
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 px-6 py-3 text-sm font-semibold text-white shadow-sm  active:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Sending test message &amp; saving…
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4" />
                                Test &amp; Save
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* ── Info Box ──────────────────────────────────────────────── */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
                <p className="text-sm font-semibold text-amber-400 mb-2">How it works</p>
                <ul className="text-xs text-amber-400/80 space-y-1.5 list-disc list-inside">
                    <li>A test WhatsApp message is sent to verify credentials before saving.</li>
                    <li><strong>Important:</strong> If using a Twilio Sandbox, you MUST send <code className="bg-amber-500/10 px-1 rounded">join &lt;your-sandbox-word&gt;</code> to your Twilio number from your WhatsApp first, otherwise Twilio will drop the message silently!</li>
                    <li>If the test fails, credentials are <strong>not saved</strong>.</li>
                    <li>Once connected, the system sends automated messages daily based on plan settings.</li>
                    <li>Enable <strong>WhatsApp Alerts</strong> on individual plans to set custom messages.</li>
                    <li>Messages are sent only once per day per member (dedup protected).</li>
                </ul>
            </div>
        </div>
    );
}
