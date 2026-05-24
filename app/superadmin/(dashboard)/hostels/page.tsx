"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Search, Plus, KeyRound, Play, Pause, XCircle, CheckCircle2, AlertTriangle, Info, Loader2, Trash2, Building2, UserCircle, ExternalLink
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

type Hostel = {
    hostelId: string; 
    hostelName: string; 
    slug: string; 
    city: string;
    adminEmail: string; 
    adminPhone?: string; 
    numberOfBlocks: number;
    status: string; 
    plan: string; 
    subscriptionStatus: string;
    isTwilioConnected: boolean; 
    createdAt: string; 
    memberCounter: number;
    stats?: {
        members: number;
        payments: number;
    };
};

export default function SuperAdminHostelsPage() {
    const [hostels, setHostels] = useState<Hostel[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // Modals
    const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [resetTarget, setResetTarget] = useState<Hostel | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

    const limit = 20;

    const fetchHostels = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/superadmin/hostels?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
            const d = await r.json();
            if (r.ok) {
                setHostels(d.data || []);
                setTotal(d.total || 0);
            } else {
                toast.error(d.error || "Failed to load hostels");
            }
        } catch (error) {
            toast.error("Network error loading hostels");
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { 
        fetchHostels(); 
    }, [fetchHostels]);

    const toggleStatus = async (h: Hostel) => {
        setIsActionLoading(true);
        try {
            const r = await fetch(`/api/superadmin/hostels/${h.hostelId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "toggle-status" }),
            });
            const d = await r.json();
            if (r.ok) {
                toast.success(`Hostel ${d.status === "ACTIVE" ? "resumed" : "suspended"} successfully`);
                fetchHostels();
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
            const r = await fetch(`/api/superadmin/hostels/${resetTarget.hostelId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reset-password", newPassword }),
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

    const deleteHostel = async (hostelId: string, confirmationText: string) => {
        setIsActionLoading(true);
        try {
            const res = await fetch(`/api/superadmin/hostels/${hostelId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmationText })
            });
            const d = await res.json();
            if (res.ok) {
                toast.success("Hostel and all data deleted permanently");
                fetchHostels();
                setShowDeleteModal(null);
                setDeleteConfirmationText("");
            } else {
                toast.error(d.error || "Failed to delete hostel");
            }
        } catch (error) {
            toast.error("Network error deleting hostel");
        } finally {
            setIsActionLoading(false);
        }
    };

    const fetchDetails = async (h: Hostel) => {
        try {
            const r = await fetch(`/api/superadmin/hostels/${h.hostelId}`);
            const d = await r.json();
            if (r.ok) {
                setSelectedHostel(d);
            } else {
                toast.error(d.error || "Failed to load hostel details");
            }
        } catch (error) {
            toast.error("Failed to load details");
        }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <SAPageHeader 
                title="Hostel Management"
                description="Manage SaaS hostel tenants, monitor activity, and control access."
                icon={<Building2 className="w-6 h-6 text-[var(--sa-accent)]" />}
                actions={
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--sa-text-muted)]" />
                            <SAInput 
                                type="text" 
                                placeholder="Search hostels..." 
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                className="pl-10 w-full md:w-64"
                            />
                        </div>
                        <a href="/hostel/register?admin=true">
                            <SAButton>
                                <Plus className="w-4 h-4"/> Add Hostel
                            </SAButton>
                        </a>
                    </div>
                }
            />

            {/* Hostel Table */}
            <SATableContainer>
                <SATable>
                    <SATHead>
                        <SATR>
                            <SATH>Hostel Info</SATH>
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
                                    <p className="text-[var(--sa-text-muted)] mt-2 text-sm">Loading hostels...</p>
                                </SATD>
                            </SATR>
                        ) : hostels.length === 0 ? (
                            <SATR>
                                <SATD colSpan={5}>
                                    <SAEmptyState 
                                        title="No hostels found" 
                                        description="Try adjusting your search criteria."
                                        icon={<Building2 className="w-6 h-6" />}
                                    />
                                </SATD>
                            </SATR>
                        ) : hostels.map(h => (
                            <SATR key={h.hostelId}>
                                <SATD>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-[var(--sa-bg-elevated)] flex items-center justify-center border border-[var(--sa-border)] font-bold text-[var(--sa-text-primary)]">
                                            {(h.hostelName || "U").charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[var(--sa-text-primary)]">{h.hostelName || "Unknown"}</div>
                                            <div className="text-xs text-[var(--sa-text-muted)] font-mono">{h.hostelId} • /{h.slug}</div>
                                        </div>
                                    </div>
                                </SATD>
                                <SATD>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-sm text-[var(--sa-text-secondary)] font-medium">
                                            <UserCircle className="h-3.5 w-3.5 text-[var(--sa-text-muted)]" />
                                            {h.adminEmail}
                                        </div>
                                        <div className="text-xs text-[var(--sa-text-muted)]">{h.adminPhone || "No phone provided"}</div>
                                    </div>
                                </SATD>
                                <SATD>
                                    {h.status === "ACTIVE" ? (
                                        <SABadge variant="success">Active</SABadge>
                                    ) : (
                                        <SABadge variant="warning">Suspended</SABadge>
                                    )}
                                </SATD>
                                <SATD>
                                    <div className="text-sm text-[var(--sa-text-secondary)] font-medium">
                                        {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : "Just Now"}
                                    </div>
                                </SATD>
                                <SATD className="text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => fetchDetails(h)}
                                            className="p-2 hover:bg-[var(--sa-bg-card-hover)] rounded-lg text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)] transition-all shadow-sm"
                                            title="View Details"
                                        >
                                            <Info className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => { setResetTarget(h); setNewPassword(""); setShowPass(false); }}
                                            className="p-2 hover:bg-[var(--sa-bg-card-hover)] rounded-lg text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)] transition-all shadow-sm"
                                            title="Reset Admin Password"
                                            disabled={isActionLoading}
                                        >
                                            <KeyRound className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => toggleStatus(h)}
                                            className={`p-2 hover:bg-[var(--sa-bg-card-hover)] rounded-lg transition-all shadow-sm ${h.status === "ACTIVE" ? "text-[var(--sa-warning)]" : "text-[var(--sa-success)]"}`}
                                            title={h.status === "ACTIVE" ? "Suspend Hostel" : "Resume Hostel"}
                                            disabled={isActionLoading}
                                        >
                                            {h.status === "ACTIVE" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                        </button>
                                        <button 
                                            onClick={() => { setShowDeleteModal(h.hostelId); setDeleteConfirmationText(""); }}
                                            className="p-2 hover:bg-[var(--sa-danger-muted)] rounded-lg text-[var(--sa-danger)] transition-all shadow-sm"
                                            title="Delete Hostel"
                                            disabled={isActionLoading}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <a 
                                            href={`/hostel/${h.slug}/admin`}
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

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--sa-border)] text-sm text-[var(--sa-text-muted)]">
                        <span>{total} hostels</span>
                        <div className="flex gap-2 items-center">
                            <SAButton variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</SAButton>
                            <span className="px-3 py-1.5 font-semibold text-[var(--sa-text-primary)]">Page {page} of {totalPages}</span>
                            <SAButton variant="secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</SAButton>
                        </div>
                    </div>
                )}
            </SATableContainer>

            {/* Details Modal */}
            <SAModal
                isOpen={!!selectedHostel}
                onClose={() => setSelectedHostel(null)}
                title="Hostel Details"
                maxWidth="md"
            >
                {selectedHostel && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-2xl bg-[var(--sa-bg-elevated)] border border-[var(--sa-border)] flex items-center justify-center">
                                <Building2 className="h-8 w-8 text-[var(--sa-accent)]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-[var(--sa-text-primary)]">{selectedHostel.hostelName}</h2>
                                <p className="text-[var(--sa-text-muted)] font-mono text-sm">/{selectedHostel.slug}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <SACard padding="sm" className="text-center">
                                <p className="text-xs font-bold text-[var(--sa-text-muted)] uppercase tracking-widest mb-1">Residents</p>
                                <p className="text-2xl font-bold text-[var(--sa-text-primary)]">{selectedHostel.stats?.members ?? 0}</p>
                            </SACard>
                            <SACard padding="sm" className="text-center">
                                <p className="text-xs font-bold text-[var(--sa-text-muted)] uppercase tracking-widest mb-1">Payments</p>
                                <p className="text-2xl font-bold text-[var(--sa-text-primary)]">{selectedHostel.stats?.payments ?? 0}</p>
                            </SACard>
                        </div>

                        <div className="space-y-0 divide-y divide-[var(--sa-border-subtle)]">
                            <div className="flex items-center justify-between py-3 text-sm">
                                <span className="text-[var(--sa-text-muted)] font-medium">Hostel ID</span>
                                <span className="text-[var(--sa-text-primary)] font-mono">{selectedHostel.hostelId}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 text-sm">
                                <span className="text-[var(--sa-text-muted)] font-medium">Blocks Count</span>
                                <span className="text-[var(--sa-text-primary)]">{selectedHostel.numberOfBlocks || 0} Block(s)</span>
                            </div>
                            <div className="flex items-center justify-between py-3 text-sm">
                                <span className="text-[var(--sa-text-muted)] font-medium">Admin Email</span>
                                <span className="text-[var(--sa-text-primary)]">{selectedHostel.adminEmail}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 text-sm">
                                <span className="text-[var(--sa-text-muted)] font-medium">City</span>
                                <span className="text-[var(--sa-text-primary)]">{selectedHostel.city || "N/A"}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 text-sm">
                                <span className="text-[var(--sa-text-muted)] font-medium">Join Date</span>
                                <span className="text-[var(--sa-text-primary)]">{selectedHostel.createdAt ? new Date(selectedHostel.createdAt).toLocaleDateString() : "N/A"}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 text-sm">
                                <span className="text-[var(--sa-text-muted)] font-medium">Contact Phone</span>
                                <span className="text-[var(--sa-text-primary)]">{selectedHostel.adminPhone || "N/A"}</span>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <SAButton variant="secondary" onClick={() => setSelectedHostel(null)} className="w-full">
                                Close
                            </SAButton>
                        </div>
                    </div>
                )}
            </SAModal>

            {/* Cascade Delete Modal */}
            {showDeleteModal && (() => {
                const hostelToDelete = hostels.find(h => h.hostelId === showDeleteModal);
                if (!hostelToDelete) return null;
                const expectedConfirmation = `delete ${hostelToDelete.hostelName}`;
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
                                    <p>This action will completely purge this hostel and all its associated data including layout, residents, staff, and payments.</p>
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
                                <SAButton variant="danger" onClick={() => isValid && deleteHostel(showDeleteModal, deleteConfirmationText)} disabled={isActionLoading || !isValid}>
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
                            Setting new password for <span className="font-semibold text-[var(--sa-text-primary)]">{resetTarget.hostelName}</span> ({resetTarget.adminEmail}).
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
