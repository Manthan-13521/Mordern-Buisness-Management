"use client";

import { useEffect, useState } from "react";
import { Plus, Tag, RefreshCw, BarChart2, CheckCircle2, Ticket } from "lucide-react";
import { toast } from "react-hot-toast";

import { SAPageHeader } from "@/components/superadmin/ui/SAPageHeader";
import { SACard } from "@/components/superadmin/ui/SACard";
import { SAKpiCard } from "@/components/superadmin/ui/SAKpiCard";
import { SATable, SATableContainer, SATHead, SATH, SATBody, SATR, SATD } from "@/components/superadmin/ui/SATable";
import { SABadge } from "@/components/superadmin/ui/SABadge";
import { SAButton } from "@/components/superadmin/ui/SAButton";
import { SAInput, SALabel } from "@/components/superadmin/ui/SAInput";

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
                toast.success("Code created successfully!");
                setCodeStr("");
                setDiscountValue("");
                setMaxUses("");
                setExpiresAt("");
                fetchReferrals();
            } else {
                toast.error(`Error: ${result.error}`);
            }
        } catch (e) {
            toast.error("Failed to create code");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <SAPageHeader 
                title="Referral Engine"
                description="Track and generate discount codes to grow the platform securely."
                icon={<Ticket className="w-6 h-6 text-[var(--sa-accent)]" />}
                actions={
                    <SAButton onClick={fetchReferrals} disabled={loading} variant="secondary">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </SAButton>
                }
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <SAKpiCard 
                    title="Total Referred Users" 
                    value={data?.totalReferralUsers ?? 0}
                    icon={<Tag className="w-6 h-6 text-[var(--sa-info)]" />}
                />
                <SAKpiCard 
                    title="Total Discounts Used" 
                    value={`₹${(data?.totalDiscounts ?? 0).toLocaleString("en-IN")}`}
                    icon={<BarChart2 className="w-6 h-6 text-[var(--sa-success)]" />}
                />
                <SAKpiCard 
                    title="Top Performing Code" 
                    value={data?.topCode ?? "No Data"}
                    icon={<CheckCircle2 className="w-6 h-6 text-[var(--sa-accent)]" />}
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Tracker Section */}
                <div className="xl:col-span-2">
                    <SATableContainer>
                        <div className="p-4 border-b border-[var(--sa-border)] flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[var(--sa-text-primary)]">Active Referral Trackers</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <SATable>
                                <SATHead>
                                    <SATR>
                                        <SATH>Code</SATH>
                                        <SATH>Discount</SATH>
                                        <SATH>Uses</SATH>
                                        <SATH>Revenue Impact</SATH>
                                        <SATH>Limit</SATH>
                                        <SATH className="text-center">Status</SATH>
                                        <SATH className="text-right">Actions</SATH>
                                    </SATR>
                                </SATHead>
                                <SATBody>
                                    {loading && (
                                        <SATR>
                                            <SATD colSpan={7} className="text-center py-10 text-[var(--sa-text-muted)] font-medium">Loading...</SATD>
                                        </SATR>
                                    )}
                                    {!loading && data?.codes?.length === 0 && (
                                        <SATR>
                                            <SATD colSpan={7} className="text-center py-10 text-[var(--sa-text-muted)] font-medium">No active referral codes.</SATD>
                                        </SATR>
                                    )}
                                    {!loading && data?.codes?.map(c => (
                                        <SATR key={c._id}>
                                            <SATD>
                                                <div className="font-bold tracking-wider text-[var(--sa-text-primary)] font-mono">{c.code}</div>
                                            </SATD>
                                            <SATD>
                                                <SABadge variant="primary" className="font-mono">
                                                    {c.discountType === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`}
                                                </SABadge>
                                            </SATD>
                                            <SATD>
                                                <span className="font-bold text-[var(--sa-info)]">{c.actualUses}</span> 
                                                <span className="text-[var(--sa-text-muted)] font-medium"> claimed</span>
                                            </SATD>
                                            <SATD>
                                                <span className="font-bold text-[var(--sa-success)]">-₹{c.revenueImpact.toLocaleString("en-IN")}</span>
                                            </SATD>
                                            <SATD>
                                                <span className="text-[var(--sa-text-secondary)] font-medium">{c.maxUses === 0 ? "Unlimited" : `${c.maxUses}`}</span>
                                            </SATD>
                                            <SATD className="text-center">
                                                {c.isActive ? (
                                                    <SABadge variant="success">Active</SABadge>
                                                ) : (
                                                    <SABadge variant="danger">Inactive</SABadge>
                                                )}
                                            </SATD>
                                            <SATD className="text-right space-x-3">
                                                <button 
                                                    onClick={async () => {
                                                        const id = toast.loading("Updating status...");
                                                        try {
                                                            await fetch("/api/superadmin/referrals", {
                                                                method: "PATCH",
                                                                headers: { "Content-Type" : "application/json" },
                                                                body: JSON.stringify({ id: c._id, isActive: !c.isActive })
                                                            });
                                                            toast.success(`Code ${c.isActive ? 'disabled' : 'enabled'}`, { id });
                                                            fetchReferrals();
                                                        } catch(e) {
                                                            toast.error("Failed to update status", { id });
                                                        }
                                                    }}
                                                    className="text-xs font-bold text-[var(--sa-info)] hover:text-[var(--sa-info-hover)] transition-colors"
                                                >
                                                    {c.isActive ? "Disable" : "Enable"}
                                                </button>
                                                <button 
                                                    onClick={async () => {
                                                        if(confirm(`Are you sure you want to delete ${c.code}?`)) {
                                                            const id = toast.loading("Deleting code...");
                                                            try {
                                                                await fetch(`/api/superadmin/referrals?id=${c._id}`, { method: "DELETE" });
                                                                toast.success("Code deleted", { id });
                                                                fetchReferrals();
                                                            } catch(e) {
                                                                toast.error("Failed to delete code", { id });
                                                            }
                                                        }
                                                    }}
                                                    className="text-xs font-bold text-[var(--sa-danger)] hover:text-[var(--sa-danger-hover)] transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </SATD>
                                        </SATR>
                                    ))}
                                </SATBody>
                            </SATable>
                        </div>
                    </SATableContainer>
                </div>

                {/* Generator Section */}
                <SACard padding="lg">
                    <h2 className="text-lg font-bold text-[var(--sa-text-primary)] mb-6 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-[var(--sa-accent)]" />
                        Generate New Code
                    </h2>
                    <form onSubmit={handleCreateCode} className="space-y-5">
                        <div>
                            <SALabel>Passcode string</SALabel>
                            <SAInput 
                                required 
                                type="text" 
                                placeholder="e.g. VIP2026"
                                value={codeStr}
                                onChange={e => setCodeStr(e.target.value.toUpperCase())}
                                className="uppercase font-mono tracking-wide w-full"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <SALabel>Type</SALabel>
                                <select 
                                    value={discountType}
                                    onChange={e => setDiscountType(e.target.value)}
                                    className="w-full appearance-none bg-[var(--sa-bg-elevated)] border border-[var(--sa-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--sa-text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--sa-accent)] focus:border-transparent transition-all"
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="flat">Flat Target (₹)</option>
                                </select>
                            </div>
                            <div>
                                <SALabel>Value</SALabel>
                                <SAInput 
                                    required
                                    type="number"
                                    min="0"
                                    value={discountValue}
                                    onChange={e => setDiscountValue(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div>
                            <SALabel>Max Limits</SALabel>
                            <SAInput 
                                type="number" 
                                min="0"
                                placeholder="0 for unlimited"
                                value={maxUses}
                                onChange={e => setMaxUses(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <SALabel>Expiry Date (Optional)</SALabel>
                            <SAInput 
                                type="date" 
                                value={expiresAt}
                                onChange={e => setExpiresAt(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="pt-2">
                            <SAButton 
                                type="submit" 
                                disabled={creating}
                                className="w-full justify-center py-3 font-bold"
                            >
                                {creating ? "Processing..." : "Deploy Passcode to Network"}
                            </SAButton>
                        </div>
                    </form>
                </SACard>
            </div>
        </div>
    );
}
