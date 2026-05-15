"use client";

import { useEffect, useState } from "react";
import { Plus, Tag, RefreshCw, BarChart2, CheckCircle2, XCircle } from "lucide-react";

export default function ReferralsAdminPage() {
    const [data, setData] = useState<{ codes: any[], totalReferralUsers: number, totalDiscounts: number, topCode: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    
    // Form state
    const [codeStr, setCodeStr] = useState("");
    const [discountType, setDiscountType] = useState("percentage");
    const [discountValue, setDiscountValue] = useState("");
    const [maxUses, setMaxUses] = useState("");
    const [expiresAt, setExpiresAt] = useState("");

    const fetchReferrals = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/superadmin/referrals");
            if (res.ok) {
                setData(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReferrals();
    }, []);

    const handleCreateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch("/api/superadmin/referrals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: codeStr,
                    discountType,
                    discountValue: Number(discountValue),
                    maxUses: maxUses ? Number(maxUses) : 0,
                    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined
                })
            });
            const result = await res.json();
            if (res.ok) {
                alert("Code created successfully!");
                setCodeStr("");
                setDiscountValue("");
                setMaxUses("");
                setExpiresAt("");
                fetchReferrals();
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (e) {
            alert("Failed to create code");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#f9fafb]">Referral Engine</h1>
                    <p className="mt-1 text-sm text-[#6b7280]">Track and generate discount codes to grow the platform securely.</p>
                </div>
                <button
                    onClick={fetchReferrals}
                    className="inline-flex items-center px-4 py-2 rounded-md bg-[#0b1220] border border-[#1f2937] text-sm font-medium text-[#9ca3af] hover:bg-[#020617] shadow-sm transition"
                >
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#0b1220] overflow-hidden rounded-xl shadow-sm border border-[#1f2937]/80 p-6 flex items-center justify-between relative group">
                    <div>
                        <p className="text-sm font-medium text-[#6b7280]">Total Referred Users</p>
                        <p className="mt-2 text-3xl font-semibold text-[#f9fafb]">{data?.totalReferralUsers ?? 0}</p>
                    </div>
                    <div className="bg-blue-500/10 p-3 rounded-lg text-blue-500">
                        <Tag className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-[#0b1220] overflow-hidden rounded-xl shadow-sm border border-[#1f2937]/80 p-6 flex items-center justify-between relative group">
                    <div>
                        <p className="text-sm font-medium text-[#6b7280]">Total Discounts Used</p>
                        <p className="mt-2 text-3xl font-semibold text-[#f9fafb]">₹{(data?.totalDiscounts ?? 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg text-emerald-500">
                        <BarChart2 className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-[#0b1220] overflow-hidden rounded-xl shadow-sm border border-[#1f2937]/80 p-6 flex items-center justify-between relative group lg:col-span-2">
                    <div>
                        <p className="text-sm font-medium text-[#6b7280]">Top Performing Code</p>
                        <p className="mt-2 text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">{data?.topCode ?? "No Data"}</p>
                    </div>
                    <div className="bg-purple-500/10 p-3 rounded-lg text-purple-400">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Tracker Section */}
                <div className="xl:col-span-2 bg-[#0b1220] shadow-sm rounded-xl border border-[#1f2937] p-6">
                    <h2 className="text-lg font-semibold text-[#f9fafb] mb-6">Active Referral Trackers</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-[#6b7280] uppercase bg-[#020617]/50 rounded-lg">
                                <tr>
                                    <th className="px-6 py-4 font-medium rounded-l-lg">Code</th>
                                    <th className="px-6 py-4 font-medium">Discount</th>
                                    <th className="px-6 py-4 font-medium">Uses</th>
                                    <th className="px-6 py-4 font-medium">Revenue Impact</th>
                                    <th className="px-6 py-4 font-medium">Limit</th>
                                    <th className="px-6 py-4 font-medium text-center">Status</th>
                                    <th className="px-6 py-4 font-medium rounded-r-lg text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={7} className="text-center py-8">Loading...</td></tr>}
                                {!loading && data?.codes?.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-[#6b7280]">No active referral codes.</td></tr>}
                                {!loading && data?.codes?.map(c => (
                                    <tr key={c._id} className="border-b last:border-0 border-[#1f2937]/60 hover:bg-[#020617]/50">
                                        <td className="px-6 py-4 font-bold tracking-wider text-[#f9fafb]">{c.code}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                {c.discountType === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-blue-600">{c.actualUses}</span> 
                                            <span className="text-[#6b7280]"> claimed</span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-emerald-400">-₹{c.revenueImpact.toLocaleString("en-IN")}</td>
                                        <td className="px-6 py-4 text-[#6b7280]">{c.maxUses === 0 ? "Unlimited" : `${c.maxUses}`}</td>
                                        <td className="px-6 py-4 text-center">
                                            {c.isActive ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-red-800 border border-rose-500/20">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button 
                                                onClick={async () => {
                                                    await fetch("/api/superadmin/referrals", {
                                                        method: "PATCH",
                                                        headers: { "Content-Type" : "application/json" },
                                                        body: JSON.stringify({ id: c._id, isActive: !c.isActive })
                                                    });
                                                    fetchReferrals();
                                                }}
                                                className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                                            >
                                                {c.isActive ? "Disable" : "Enable"}
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    if(confirm(`Are you sure you want to delete ${c.code}?`)) {
                                                        await fetch(`/api/superadmin/referrals?id=${c._id}`, { method: "DELETE" });
                                                        fetchReferrals();
                                                    }
                                                }}
                                                className="text-xs font-medium text-rose-400 hover:text-red-300"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Generator Section */}
                <div className="bg-[#0b1220] shadow-sm rounded-xl border border-[#1f2937] p-6">
                    <h2 className="text-lg font-semibold text-[#f9fafb] mb-6 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-indigo-500" />
                        Generate New Code
                    </h2>
                    <form onSubmit={handleCreateCode} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-[#9ca3af] mb-1">Passcode string</label>
                            <input 
                                required 
                                type="text" 
                                placeholder="e.g. VIP2026"
                                value={codeStr}
                                onChange={e => setCodeStr(e.target.value.toUpperCase())}
                                className="block w-full rounded-md border-[#1f2937] bg-[#0b1220] py-2.5 px-3 shadow-sm focus:border-[#8b5cf6] focus:ring-[#8b5cf6] uppercase font-mono tracking-wide"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[#9ca3af] mb-1">Type</label>
                                <select 
                                    value={discountType}
                                    onChange={e => setDiscountType(e.target.value)}
                                    className="block w-full rounded-md border-[#1f2937] bg-[#0b1220] py-2.5 px-3 shadow-sm focus:border-[#8b5cf6] focus:ring-[#8b5cf6]"
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="flat">Flat Target (₹)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#9ca3af] mb-1">Value</label>
                                <input 
                                    required
                                    type="number"
                                    min="0"
                                    value={discountValue}
                                    onChange={e => setDiscountValue(e.target.value)}
                                    className="block w-full rounded-md border-[#1f2937] bg-[#0b1220] py-2.5 px-3 shadow-sm focus:border-[#8b5cf6] focus:ring-[#8b5cf6]"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#9ca3af] mb-1">Max Limits</label>
                            <input 
                                type="number" 
                                min="0"
                                placeholder="0 for unlimited"
                                value={maxUses}
                                onChange={e => setMaxUses(e.target.value)}
                                className="block w-full rounded-md border-[#1f2937] bg-[#0b1220] py-2.5 px-3 shadow-sm focus:border-[#8b5cf6] focus:ring-[#8b5cf6]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#9ca3af] mb-1">Expiry Date (Optional)</label>
                            <input 
                                type="date" 
                                value={expiresAt}
                                onChange={e => setExpiresAt(e.target.value)}
                                className="block w-full rounded-md border-[#1f2937] bg-[#0b1220] py-2.5 px-3 shadow-sm focus:border-[#8b5cf6] focus:ring-[#8b5cf6]"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={creating}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6] disabled:opacity-50 transition"
                        >
                            {creating ? "Processing..." : "Deploy Passcode to Network"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
