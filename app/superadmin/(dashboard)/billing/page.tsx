"use client";

import { useEffect, useState } from "react";
import { CreditCard, RefreshCw, Search, ArrowUpRight, Copy } from "lucide-react";
import { toast } from "react-hot-toast";

import { SAPageHeader } from "@/components/superadmin/ui/SAPageHeader";
import { SAKpiCard } from "@/components/superadmin/ui/SAKpiCard";
import { SATable, SATableContainer, SATHead, SATH, SATBody, SATR, SATD } from "@/components/superadmin/ui/SATable";
import { SABadge } from "@/components/superadmin/ui/SABadge";
import { SAButton } from "@/components/superadmin/ui/SAButton";

export default function PlatformBillingDashboard() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBilling = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/superadmin/dashboard");
            if (res.ok) {
                const data = await res.json();
                setLogs(data.billingLogs || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBilling(); }, []);

    const totalRevenue = logs.reduce((sum, b) => sum + (b.amount || 0), 0);
    const manualEntries = logs.filter(b => b.paymentMode && (b.paymentMode.includes("Admin:") || b.method === "manual" || b.method === "cash"));

    const getMethodBadge = (method: string) => {
        const type = method?.toLowerCase();
        if (type === "upi") return <SABadge variant="primary">UPI</SABadge>;
        if (type === "razorpay") return <SABadge variant="info">Razorpay</SABadge>;
        if (type === "cash") return <SABadge variant="success">Cash</SABadge>;
        if (type === "bank_transfer") return <SABadge variant="info">Bank Transfer</SABadge>;
        if (type === "card") return <SABadge variant="warning">Card</SABadge>;
        if (type === "manual") return <SABadge variant="warning">Manual</SABadge>;
        return <SABadge>{method || "Unknown"}</SABadge>;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <SAPageHeader 
                title="Platform Billing & Invoices"
                description="All SaaS subscription payments and manual activations."
                icon={<CreditCard className="w-6 h-6 text-[var(--sa-accent)]" />}
                actions={
                    <SAButton onClick={fetchBilling} disabled={loading} variant="secondary">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </SAButton>
                }
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <SAKpiCard 
                    title="Total Collected" 
                    value={`₹${totalRevenue.toLocaleString("en-IN")}`}
                    icon={<CreditCard className="w-6 h-6 text-[var(--sa-success)]" />}
                />
                <SAKpiCard 
                    title="Total Transactions" 
                    value={logs.length}
                    icon={<ArrowUpRight className="w-6 h-6 text-[var(--sa-info)]" />}
                />
                <SAKpiCard 
                    title="UPI Activations" 
                    value={logs.filter(b => b.method === "upi").length}
                    icon={<CreditCard className="w-6 h-6 text-[var(--sa-accent)]" />}
                />
                <SAKpiCard 
                    title="Manual Entries" 
                    value={manualEntries.length}
                    icon={<Copy className="w-6 h-6 text-[var(--sa-warning)]" />}
                />
            </div>

            {/* Transaction Table */}
            <SATableContainer>
                <div className="p-4 border-b border-[var(--sa-border)] flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[var(--sa-text-primary)]">Transaction History</h3>
                </div>
                <SATable>
                    <SATHead>
                        <SATR>
                            <SATH>#</SATH>
                            <SATH>Timestamp</SATH>
                            <SATH>SaaS ID & Business</SATH>
                            <SATH className="text-right">Amount</SATH>
                            <SATH>Method</SATH>
                            <SATH>Payer</SATH>
                            <SATH>Ref Code</SATH>
                            <SATH className="text-right">Discount</SATH>
                            <SATH>Billing Period</SATH>
                        </SATR>
                    </SATHead>
                    <SATBody>
                        {loading && (
                            <SATR>
                                <SATD colSpan={9} className="text-center py-12 text-[var(--sa-text-muted)] font-medium">Loading...</SATD>
                            </SATR>
                        )}
                        {!loading && logs.length === 0 && (
                            <SATR>
                                <SATD colSpan={9} className="text-center py-12 text-[var(--sa-text-muted)] font-medium">No billing records yet. Revenue will appear here after first subscription activation.</SATD>
                            </SATR>
                        )}
                        {!loading && logs.map((b, i) => {
                            // Extract payer name from paymentMode like "UPI (Admin: John Doe)"
                            const payerMatch = b.paymentMode?.match(/\(Admin:\s*(.+?)\)/);
                            const payerName = payerMatch ? payerMatch[1] : "—";
                            const isManual = b.paymentMode?.includes("Admin:");

                            return (
                                <SATR key={b._id || i}>
                                    <SATD className="text-[var(--sa-text-muted)] font-mono text-xs font-semibold">{i + 1}</SATD>
                                    <SATD className="text-[var(--sa-text-secondary)] font-medium text-sm">
                                        {new Date(b.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </SATD>
                                    <SATD>
                                        <div className="font-bold text-[var(--sa-text-primary)] uppercase tracking-tight">{b.orgName || "—"}</div>
                                        <div className="font-mono text-xs text-[var(--sa-text-muted)] mt-0.5">{b.entityId || "N/A"}</div>
                                    </SATD>
                                    <SATD className="text-right font-bold text-[var(--sa-success)] text-base">₹{b.amount?.toLocaleString("en-IN")}</SATD>
                                    <SATD>
                                        {getMethodBadge(b.method)}
                                    </SATD>
                                    <SATD>
                                        {isManual ? (
                                            <span className="text-[var(--sa-warning)] font-semibold">{payerName}</span>
                                        ) : (
                                            <span className="text-[var(--sa-text-muted)]">—</span>
                                        )}
                                    </SATD>
                                    <SATD>
                                        {b.referralCodeUsed ? (
                                            <SABadge variant="primary" className="font-mono tracking-wider">
                                                {b.referralCodeUsed}
                                            </SABadge>
                                        ) : (
                                            <span className="text-[var(--sa-text-muted)]">—</span>
                                        )}
                                    </SATD>
                                    <SATD className="text-right font-bold text-[var(--sa-danger)]">
                                        {b.discountApplied ? `-₹${b.discountApplied.toLocaleString("en-IN")}` : <span className="text-[var(--sa-text-muted)] font-normal">—</span>}
                                    </SATD>
                                    <SATD className="text-[var(--sa-text-secondary)] font-medium text-sm">
                                        {new Date(b.periodStart).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                        {" → "}
                                        {new Date(b.periodEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                                    </SATD>
                                </SATR>
                            );
                        })}
                    </SATBody>
                </SATable>
            </SATableContainer>
        </div>
    );
}
