"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Search, Plus, KeyRound, Play, Pause, XCircle, CheckCircle2, AlertTriangle, Info, Loader2, Trash2, Droplets, UserCircle, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";

import { SACard } from "@/components/superadmin/ui/SACard";
import { SABadge } from "@/components/superadmin/ui/SABadge";
import { SATable, SATableContainer, SATHead, SATH, SATBody, SATR, SATD } from "@/components/superadmin/ui/SATable";
import { SAPageHeader } from "@/components/superadmin/ui/SAPageHeader";
import { SAButton } from "@/components/superadmin/ui/SAButton";
import { SAModal } from "@/components/superadmin/ui/SAModal";
import { SAInput, SALabel } from "@/components/superadmin/ui/SAInput";
import { SAEmptyState } from "@/components/superadmin/ui/SAEmptyState";

type Pool = {
    _id: string; 
    poolId: string; 
    poolName: string; 
    slug: string; 
    city: string;
    adminEmail: string; 
    adminPhone?: string; 
    status: string; 
    subscriptionStatus: string;
    createdAt: string; 
    stats?: {
        members: number;
        payments: number;
    };
};

export default function SuperAdminPoolsPage() {
    const [pools, setPools] = useState<Pool[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // Modals
    const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [resetTarget, setResetTarget] = useState<Pool | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

    const fetchPools = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/superadmin/pools`);
            const d = await r.json();
            if (r.ok) {
                setPools(d || []);
            } else {
                toast.error(d.error || "Failed to load pools");
            }
        } catch (error) {
            toast.error("Network error loading pools");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { 
        fetchPools(); 
    }, [fetchPools]);

    const toggleStatus = async (p: Pool) => {
        setIsActionLoading(true);
        try {
            const r = await fetch(`/api/superadmin/pools/${p.poolId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "toggle-status" }),
            });
            const d = await r.json();
            if (r.ok) {
                toast.success(`Pool ${d.status === "paused" ? "paused" : "resumed"} successfully`);
                fetchPools();
            } else {
                toast.error(d.error || "Failed to toggle status");
            }
        } catch (error) {
            toast.error("Network error toggling status");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetTarget) return;
        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }
        setIsActionLoading(true);
        try {
            const r = await fetch(`/api/superadmin/pools/${resetTarget.poolId}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword }),
            });
            const d = await r.json();
            if (r.ok) {
                toast.success("Password reset securely. All active sessions invalidated.");
                setResetTarget(null);
                setNewPassword("");
            } else {
                toast.error(d.error || "Failed to reset password");
            }
        } catch (error) {
            toast.error("Network error resetting password");
        } finally {
            setIsActionLoading(false);
        }
    };

    const deletePool = async (poolId: string, confirmationText: string) => {
        setIsActionLoading(true);
        try {
            const r = await fetch(`/api/superadmin/pools/${poolId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmationText })
            });
            const d = await r.json();
            if (r.ok) {
                toast.success("Pool and all data deleted permanently");
                fetchPools();
                setShowDeleteModal(null);
                setDeleteConfirmationText("");
            } else {
                toast.error(d.error || "Failed to delete pool");
            }
        } catch (error) {
            toast.error("Network error deleting pool");
        } finally {
            setIsActionLoading(false);
        }
    };

    const fetchDetails = async (p: Pool) => {
        try {
            const r = await fetch(`/api/superadmin/pools/${p.poolId}`);
            const d = await r.json();
            if (r.ok) {
                setSelectedPool(d);
            } else {
                toast.error(d.error || "Failed to load pool details");
            }
        } catch (error) {
            toast.error("Failed to load details");
        }
    };

    const filteredPools = pools.filter(p => 
        (p.poolName || "").toLowerCase().includes(search.toLowerCase()) || 
        (p.slug || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.adminEmail || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <SAPageHeader 
                title="Pool Management"
                description="Manage SaaS pool tenants, monitor activity, and control access."
                icon={<Droplets className="w-6 h-6" />}
                actions={
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--sa-text-muted)]" />
                            <SAInput 
                                type="text" 
                                placeholder="Search pools..." 
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-10 w-full md:w-64"
                            />
                        </div>
                        <Link href="/subscribe?admin=true">
                            <SAButton>
                                <Plus className="w-4 h-4"/> Add Pool
                            </SAButton>
                        </Link>
                    </div>
                }
            />

            {/* Pool Table */}
            <SATableContainer>
                <SATable>
                    <SATHead>
                        <SATR>
                            <SATH>Pool Info</SATH>
                            <SATH>Contact & Admin</SATH>
                            <SATH>Status</SATH>
                            <SATH>Registered</SATH>
                            <SATH className="text-right">Actions</SATH>
                        </SATR>
                    </SATHead>
                    <SATBody>
                        {loading ? (
                            <SATR>
                                <SATD colSpan={5} className="text-center py-20">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-[var(--sa-accent)]" />
                                    <p className="text-[var(--sa-text-muted)] mt-2 text-sm">Loading pools...</p>
                                </SATD>
                            </SATR>
                        ) : filteredPools.length === 0 ? (
                            <SATR>
                                <SATD colSpan={5}>
                                    <SAEmptyState 
                                        title="No pools found" 
                                        description="Try adjusting your search criteria."
                                        icon={<Droplets className="w-6 h-6" />}
                                    />
                                </SATD>
                            </SATR>
                        ) : filteredPools.map(p => (
                            <SATR key={p.poolId}>
                                <SATD>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-[var(--sa-bg-elevated)] flex items-center justify-center border border-[var(--sa-border)] font-bold text-[var(--sa-text-primary)]">
                                            {(p.poolName || "U").charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[var(--sa-text-primary)]">{p.poolName || "Unknown"}</div>
                                            <div className="text-xs text-[var(--sa-text-muted)] font-mono">{p.poolId} • /{p.slug}</div>
                                        </div>
                                    </div>
                                </SATD>
                                <SATD>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-sm text-[var(--sa-text-secondary)] font-medium">
                                            <UserCircle className="h-3.5 w-3.5 text-[var(--sa-text-muted)]" />
                                            {p.adminEmail}
                                        </div>
                                        <div className="text-xs text-[var(--sa-text-muted)]">{p.adminPhone || "No phone provided"}</div>
                                    </div>
                                </SATD>
                                <SATD>
                                    {p.subscriptionStatus !== "paused" && p.status !== "PAUSED" ? (
                                        <SABadge variant="success">Active</SABadge>
                                    ) : (
                                        <SABadge variant="warning">Paused</SABadge>
                                    )}
                                </SATD>
                                <SATD>
                                    <div className="text-sm text-[var(--sa-text-secondary)] font-medium">
                                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "Just Now"}
                                    </div>
                                </SATD>
                                <SATD className="text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => fetchDetails(p)}
                                            className="p-2 hover:bg-[var(--sa-bg-card-hover)] rounded-lg text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)] transition-all shadow-sm"
                                            title="View Details"
                                        >
                                            <Info className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => { setResetTarget(p); setNewPassword(""); setShowPass(false); }}
                                            className="p-2 hover:bg-[var(--sa-bg-card-hover)] rounded-lg text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)] transition-all shadow-sm"
                                            title="Reset Admin Password"
                                            disabled={isActionLoading}
                                        >
                                            <KeyRound className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => toggleStatus(p)}
                                            className={`p-2 hover:bg-[var(--sa-bg-card-hover)] rounded-lg transition-all shadow-sm ${p.subscriptionStatus !== "paused" ? "text-[var(--sa-warning)]" : "text-[var(--sa-success)]"}`}
                                            title={p.subscriptionStatus !== "paused" ? "Pause Pool" : "Resume Pool"}
                                            disabled={isActionLoading}
                                        >
                                            {p.subscriptionStatus !== "paused" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                        </button>
                                        <button 
                                            onClick={() => { setShowDeleteModal(p.poolId); setDeleteConfirmationText(""); }}
                                            className="p-2 hover:bg-[var(--sa-danger-muted)] rounded-lg text-[var(--sa-danger)] transition-all shadow-sm"
                                            title="Delete Pool"
                                            disabled={isActionLoading}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <a 
                                            href={`/pool/${p.slug}/admin`}
                                            target="_blank"
                                            className="p-2 hover:bg-[var(--sa-info-muted)] rounded-lg text-[var(--sa-info)] transition-all shadow-sm"
                                            title="Open Dashboard"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </div>
                                </SATD>
                            </SATR>
                        ))}
                    </SATBody>
                </SATable>
            </SATableContainer>

            {/* Details Modal */}
            <SAModal
                isOpen={!!selectedPool}
                onClose={() => setSelectedPool(null)}
                title="Pool Details"
                maxWidth="md"
            >
                {selectedPool && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-2xl bg-[var(--sa-bg-elevated)] border border-[var(--sa-border)] flex items-center justify-center">
                                <Droplets className="h-8 w-8 text-[var(--sa-accent)]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-[var(--sa-text-primary)]">{selectedPool.poolName}</h2>
                                <p className="text-[var(--sa-text-muted)] font-mono text-sm">/{selectedPool.slug}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <SACard padding="sm" className="text-center">
                                <p className="text-xs font-bold text-[var(--sa-text-muted)] uppercase tracking-widest mb-1">Members</p>
                                <p className="text-2xl font-bold text-[var(--sa-text-primary)]">{selectedPool.stats?.members ?? 0}</p>
                            </SACard>
                            <SACard padding="sm" className="text-center">
                                <p className="text-xs font-bold text-[var(--sa-text-muted)] uppercase tracking-widest mb-1">Payments</p>
                                <p className="text-2xl font-bold text-[var(--sa-text-primary)]">{selectedPool.stats?.payments ?? 0}</p>
                            </SACard>
                        </div>

                        <div className="space-y-0 divide-y divide-[var(--sa-border-subtle)]">
                            <div className="flex items-center justify-between py-3 text-sm">
                                <span className="text-[var(--sa-text-muted)] font-medium">Pool ID</span>
                                <span className="text-[var(--sa-text-primary)] font-mono">{selectedPool.poolId}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 text-sm">
                                <span className="text-[var(--sa-text-muted)] font-medium">Admin Email</span>
                                <span className="text-[var(--sa-text-primary)]">{selectedPool.adminEmail}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 text-sm">
                                <span className="text-[var(--sa-text-muted)] font-medium">City</span>
                                <span className="text-[var(--sa-text-primary)]">{selectedPool.city || "N/A"}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 text-sm">
                                <span className="text-[var(--sa-text-muted)] font-medium">Join Date</span>
                                <span className="text-[var(--sa-text-primary)]">{selectedPool.createdAt ? new Date(selectedPool.createdAt).toLocaleDateString() : "N/A"}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 text-sm">
                                <span className="text-[var(--sa-text-muted)] font-medium">Contact Phone</span>
                                <span className="text-[var(--sa-text-primary)]">{selectedPool.adminPhone || "N/A"}</span>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <SAButton variant="secondary" onClick={() => setSelectedPool(null)} className="w-full">
                                Close
                            </SAButton>
                        </div>
                    </div>
                )}
            </SAModal>

            {/* Cascade Delete Modal */}
            {showDeleteModal && (() => {
                const poolToDelete = pools.find(p => p.poolId === showDeleteModal);
                if (!poolToDelete) return null;
                const expectedConfirmation = `delete ${poolToDelete.poolName}`;
                const isValid = deleteConfirmationText === expectedConfirmation;

                return (
                    <SAModal
                        isOpen={!!showDeleteModal}
                        onClose={() => { setShowDeleteModal(null); setDeleteConfirmationText(""); }}
                        title="Permanent Deletion"
                        maxWidth="md"
                    >
                        <div className="space-y-6">
                            <div className="bg-[var(--sa-danger-muted)] text-[var(--sa-danger)] p-4 rounded-xl flex gap-3 text-sm font-medium border border-[var(--sa-danger)]/20">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <div>
                                    <p className="font-bold mb-1">IRREVERSIBLE ACTION</p>
                                    <p>This action will completely purge this pool and all its associated data including members, payments, and entry logs.</p>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <SALabel>
                                    Type <span className="text-[var(--sa-danger)] select-all font-mono bg-[var(--sa-danger-muted)] px-1 py-0.5 rounded">{expectedConfirmation}</span> to confirm.
                                </SALabel>
                                <SAInput
                                    type="text"
                                    value={deleteConfirmationText}
                                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                                    onPaste={(e) => e.preventDefault()}
                                    placeholder={expectedConfirmation}
                                    disabled={isActionLoading}
                                    className="font-mono text-[var(--sa-danger)]"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--sa-border-subtle)]">
                                <SAButton variant="secondary" onClick={() => { setShowDeleteModal(null); setDeleteConfirmationText(""); }} disabled={isActionLoading}>
                                    Cancel
                                </SAButton>
                                <SAButton variant="danger" onClick={() => isValid && deletePool(showDeleteModal, deleteConfirmationText)} disabled={isActionLoading || !isValid}>
                                    {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                    Delete System
                                </SAButton>
                            </div>
                        </div>
                    </SAModal>
                );
            })()}

            {/* Reset Password Modal */}
            {resetTarget && (
                <SAModal
                    isOpen={!!resetTarget}
                    onClose={() => !isActionLoading && setResetTarget(null)}
                    title="Reset Password"
                    maxWidth="sm"
                >
                    <div className="space-y-4">
                        <p className="text-sm text-[var(--sa-text-secondary)]">
                            Setting new password for <span className="font-semibold text-[var(--sa-text-primary)]">{resetTarget.poolName}</span> ({resetTarget.adminEmail}).
                        </p>
                        <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
                            <div>
                                <SALabel>New Password</SALabel>
                                <div className="relative">
                                    <SAInput
                                        required
                                        type={showPass ? "text" : "password"}
                                        minLength={8}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Min 8 characters"
                                        className="pr-16"
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]">
                                        <span className="text-xs font-semibold">{showPass ? "HIDE" : "SHOW"}</span>
                                    </button>
                                </div>
                            </div>
                            <SAButton type="submit" variant="primary" disabled={isActionLoading} className="w-full">
                                {isActionLoading ? "Resetting…" : "Confirm Reset"}
                            </SAButton>
                        </form>
                    </div>
                </SAModal>
            )}
        </div>
    );
}
