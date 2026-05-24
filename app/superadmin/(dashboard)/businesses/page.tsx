"use client";

import { useEffect, useState } from "react";
import { 
    Briefcase, 
    Search, 
    Trash2, 
    Pause, 
    Play, 
    ExternalLink, 
    Info, 
    AlertTriangle,
    Loader2,
    CheckCircle2,
    XCircle,
    UserCircle,
    KeyRound
} from "lucide-react";
import { toast } from "react-hot-toast";

import { SACard } from "@/components/superadmin/ui/SACard";
import { SABadge } from "@/components/superadmin/ui/SABadge";
import { SATable, SATableContainer, SATHead, SATH, SATBody, SATR, SATD } from "@/components/superadmin/ui/SATable";
import { SAPageHeader } from "@/components/superadmin/ui/SAPageHeader";
import { SAButton } from "@/components/superadmin/ui/SAButton";
import { SAModal } from "@/components/superadmin/ui/SAModal";
import { SAInput, SALabel } from "@/components/superadmin/ui/SAInput";
import { SAEmptyState } from "@/components/superadmin/ui/SAEmptyState";

interface Business {
    _id: string;
    businessId: string;
    name: string;
    slug: string;
    phone: string;
    adminEmail: string;
    isActive: boolean;
    createdAt: string;
    stats?: {
        customers: number;
        transactions: number;
    };
}

export default function ManageBusinessesPage() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [resetTarget, setResetTarget] = useState<Business | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const fetchBusinesses = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/superadmin/businesses");
            const data = await res.json();
            if (res.ok) {
                setBusinesses(data);
            } else {
                toast.error(data.error || "Failed to load businesses");
            }
        } catch (error) {
            toast.error("Network error loading businesses");
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (businessId: string, currentStatus: boolean) => {
        setIsActionLoading(true);
        try {
            const res = await fetch(`/api/superadmin/businesses/${businessId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Business ${data.isActive ? "resumed" : "paused"} successfully`);
                fetchBusinesses();
            } else {
                toast.error(data.error || "Failed to toggle status");
            }
        } catch (error) {
            toast.error("Network error toggling status");
        } finally {
            setIsActionLoading(false);
        }
    };

    const deleteBusiness = async (businessId: string, confirmationText: string) => {
        setIsActionLoading(true);
        try {
            const res = await fetch(`/api/superadmin/businesses/${businessId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmationText })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Business and all data deleted permanently");
                fetchBusinesses();
                setShowDeleteModal(null);
                setDeleteConfirmationText("");
            } else {
                toast.error(data.error || "Failed to delete business");
            }
        } catch (error) {
            toast.error("Network error deleting business");
        } finally {
            setIsActionLoading(false);
        }
    };

    const fetchDetails = async (business: Business) => {
        try {
            const res = await fetch(`/api/superadmin/businesses/${business.businessId}`);
            const data = await res.json();
            if (res.ok) {
                setSelectedBusiness(data);
            }
        } catch (error) {
            toast.error("Failed to load details");
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
            const res = await fetch(`/api/superadmin/businesses/${resetTarget.businessId}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Password reset securely. All active sessions invalidated.");
                setResetTarget(null);
                setNewPassword("");
            } else {
                toast.error(data.error || "Failed to reset password");
            }
        } catch (error) {
            toast.error("Network error resetting password");
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredBusinesses = businesses.filter(b => 
        b.name.toLowerCase().includes(search.toLowerCase()) || 
        b.slug.toLowerCase().includes(search.toLowerCase()) ||
        b.adminEmail.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <SAPageHeader 
                title="Business Management"
                description="Manage SaaS business tenants, monitor activity, and control access."
                icon={<Briefcase className="w-6 h-6 text-[var(--sa-accent)]" />}
                actions={
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--sa-text-muted)]" />
                            <SAInput 
                                type="text" 
                                placeholder="Search by name, slug or email..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 w-full md:w-64"
                            />
                        </div>
                        <a href="/business/register?admin=true">
                            <SAButton>
                                <Plus className="w-4 h-4"/> Add Business
                            </SAButton>
                        </a>
                    </div>
                }
            />

            {/* Business Table */}
            <SATableContainer>
                <SATable>
                    <SATHead>
                        <SATR>
                            <SATH>Business Info</SATH>
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
                                    <p className="text-[var(--sa-text-muted)] mt-2 text-sm">Loading businesses...</p>
                                </SATD>
                            </SATR>
                        ) : filteredBusinesses.length === 0 ? (
                            <SATR>
                                <SATD colSpan={5}>
                                    <SAEmptyState 
                                        title="No businesses found" 
                                        description="Try adjusting your search criteria."
                                        icon={<Briefcase className="w-6 h-6" />}
                                    />
                                </SATD>
                            </SATR>
                        ) : filteredBusinesses.map((business) => (
                            <SATR key={business._id}>
                                <SATD>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-[var(--sa-bg-elevated)] flex items-center justify-center border border-[var(--sa-border)] font-bold text-[var(--sa-text-primary)]">
                                            {business.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[var(--sa-text-primary)]">{business.name}</div>
                                            <div className="text-xs text-[var(--sa-text-muted)] font-mono">{business.businessId} • /{business.slug}</div>
                                        </div>
                                    </div>
                                </SATD>
                                <SATD>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-sm text-[var(--sa-text-secondary)] font-medium">
                                            <UserCircle className="h-3.5 w-3.5 text-[var(--sa-text-muted)]" />
                                            {business.adminEmail}
                                        </div>
                                        <div className="text-xs text-[var(--sa-text-muted)]">{business.phone || "No phone provided"}</div>
                                    </div>
                                </SATD>
                                <SATD>
                                    {business.isActive ? (
                                        <SABadge variant="success">Active</SABadge>
                                    ) : (
                                        <SABadge variant="warning">Paused</SABadge>
                                    )}
                                </SATD>
                                <SATD>
                                    <div className="text-sm text-[var(--sa-text-secondary)] font-medium">
                                        {new Date(business.createdAt).toLocaleDateString()}
                                    </div>
                                </SATD>
                                <SATD className="text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => fetchDetails(business)}
                                            className="p-2 hover:bg-[var(--sa-bg-card-hover)] rounded-lg text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)] transition-all shadow-sm"
                                            title="View Details"
                                        >
                                            <Info className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => { setResetTarget(business); setNewPassword(""); setShowPass(false); }}
                                            className="p-2 hover:bg-[var(--sa-bg-card-hover)] rounded-lg text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)] transition-all shadow-sm"
                                            title="Reset Admin Password"
                                            disabled={isActionLoading}
                                        >
                                            <KeyRound className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => toggleStatus(business.businessId, business.isActive)}
                                            className={`p-2 hover:bg-[var(--sa-bg-card-hover)] rounded-lg transition-all shadow-sm ${business.isActive ? "text-[var(--sa-warning)]" : "text-[var(--sa-success)]"}`}
                                            title={business.isActive ? "Pause Business" : "Resume Business"}
                                            disabled={isActionLoading}
                                        >
                                            {business.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                        </button>
                                        <button 
                                            onClick={() => { setShowDeleteModal(business.businessId); setDeleteConfirmationText(""); }}
                                            className="p-2 hover:bg-[var(--sa-danger-muted)] rounded-lg text-[var(--sa-danger)] transition-all shadow-sm"
                                            title="Delete Business"
                                            disabled={isActionLoading}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <a 
                                            href={`/business/${business.slug}/admin`}
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
                isOpen={!!selectedBusiness}
                onClose={() => setSelectedBusiness(null)}
                title="Business Details"
                maxWidth="md"
            >
                {selectedBusiness && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-2xl bg-[var(--sa-bg-elevated)] border border-[var(--sa-border)] flex items-center justify-center">
                                <Briefcase className="h-8 w-8 text-[var(--sa-accent)]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-[var(--sa-text-primary)]">{selectedBusiness.name}</h2>
                                <p className="text-[var(--sa-text-muted)] font-mono text-sm">/{selectedBusiness.slug}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <SACard padding="sm" className="text-center">
                                <p className="text-xs font-bold text-[var(--sa-text-muted)] uppercase tracking-widest mb-1">Customers</p>
                                <p className="text-2xl font-bold text-[var(--sa-text-primary)]">{selectedBusiness.stats?.customers || 0}</p>
                            </SACard>
                            <SACard padding="sm" className="text-center">
                                <p className="text-xs font-bold text-[var(--sa-text-muted)] uppercase tracking-widest mb-1">Transactions</p>
                                <p className="text-2xl font-bold text-[var(--sa-text-primary)]">{selectedBusiness.stats?.transactions || 0}</p>
                            </SACard>
                        </div>

                        <div className="space-y-0 divide-y divide-[var(--sa-border-subtle)]">
                            <div className="flex items-center justify-between py-3 text-sm">
                                <span className="text-[var(--sa-text-muted)] font-medium">Business ID</span>
                                <span className="text-[var(--sa-text-primary)] font-mono">{selectedBusiness.businessId}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 text-sm">
                                <span className="text-[var(--sa-text-muted)] font-medium">Admin Email</span>
                                <span className="text-[var(--sa-text-primary)]">{selectedBusiness.adminEmail}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 text-sm">
                                <span className="text-[var(--sa-text-muted)] font-medium">Join Date</span>
                                <span className="text-[var(--sa-text-primary)]">{new Date(selectedBusiness.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 text-sm">
                                <span className="text-[var(--sa-text-muted)] font-medium">Contact Phone</span>
                                <span className="text-[var(--sa-text-primary)]">{selectedBusiness.phone || "N/A"}</span>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <SAButton variant="secondary" onClick={() => setSelectedBusiness(null)} className="w-full">
                                Close
                            </SAButton>
                        </div>
                    </div>
                )}
            </SAModal>

            {/* Cascade Delete Modal */}
            {showDeleteModal && (() => {
                const businessToDelete = businesses.find(b => b.businessId === showDeleteModal);
                if (!businessToDelete) return null;
                const expectedConfirmation = `delete ${businessToDelete.name}`;
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
                                    <p>This action will completely purge this business and all its sub-collections including transactions and customers.</p>
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
                                <SAButton variant="danger" onClick={() => isValid && deleteBusiness(showDeleteModal, deleteConfirmationText)} disabled={isActionLoading || !isValid}>
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
                            Setting new password for <span className="font-semibold text-[var(--sa-text-primary)]">{resetTarget.name}</span> ({resetTarget.adminEmail}).
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
