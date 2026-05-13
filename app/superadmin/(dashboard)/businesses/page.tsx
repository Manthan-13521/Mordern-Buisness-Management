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
    const [resetCreds, setResetCreds] = useState<{ email: string; pass: string } | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

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

    const deleteBusiness = async (businessId: string) => {
        setIsActionLoading(true);
        try {
            const res = await fetch(`/api/superadmin/businesses/${businessId}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Business and all data deleted permanently");
                fetchBusinesses();
                setShowDeleteModal(null);
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

    const handleResetPassword = async (businessId: string) => {
        if (!confirm("Are you sure you want to forcibly reset the password for this business admin?")) return;
        setIsActionLoading(true);
        try {
            const res = await fetch(`/api/superadmin/businesses/${businessId}/reset-password`, {
                method: "POST"
            });
            const data = await res.json();
            if (res.ok) {
                setResetCreds({ email: data.adminEmail, pass: data.newPassword });
                toast.success("Password reset securely");
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <Briefcase className="h-8 w-8 text-blue-500" />
                        Business Management
                    </h1>
                    <p className="text-[#9ca3af] mt-1">Manage SaaS business tenants, monitor activity, and control access.</p>
                </div>
                
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
                    <input 
                        type="text" 
                        placeholder="Search by name, slug or email..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-[#0b1220] border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 w-full md:w-80 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                </div>
            </div>

            {/* Business Table */}
            <div className="bg-[#0b1220]/50 border border-neutral-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-800/50 text-[#9ca3af] text-xs uppercase tracking-wider font-bold border-b border-neutral-800">
                                <th className="px-6 py-4">Business Info</th>
                                <th className="px-6 py-4">Contact & Admin</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Registered</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                                        <p className="text-[#6b7280] mt-2 text-sm">Loading businesses...</p>
                                    </td>
                                </tr>
                            ) : filteredBusinesses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="bg-neutral-800/50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Briefcase className="h-8 w-8 text-neutral-600" />
                                        </div>
                                        <p className="text-[#9ca3af] font-medium">No businesses found</p>
                                        <p className="text-[#6b7280] text-sm mt-1">Try adjusting your search criteria</p>
                                    </td>
                                </tr>
                            ) : filteredBusinesses.map((business) => (
                                <tr key={business._id} className="hover:bg-[#8b5cf6]/5 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-[#1f2937] font-bold text-blue-400">
                                                {business.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-neutral-100">{business.name}</div>
                                                <div className="text-xs text-[#6b7280] font-mono">/{business.slug}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                                                <UserCircle className="h-3.5 w-3.5 text-[#6b7280]" />
                                                {business.adminEmail}
                                            </div>
                                            <div className="text-xs text-[#6b7280]">{business.phone || "No phone provided"}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        {business.isActive ? (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                                                <CheckCircle2 className="h-3 w-3" /> Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold border border-orange-500/20">
                                                <XCircle className="h-3 w-3" /> Paused
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-sm text-[#9ca3af]">
                                            {new Date(business.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => fetchDetails(business)}
                                                className="p-2 hover:bg-[#8b5cf6]/10 rounded-lg text-[#9ca3af] hover:text-[#f9fafb] transition-all shadow-sm"
                                                title="View Details"
                                            >
                                                <Info className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleResetPassword(business.businessId)}
                                                className="p-2 hover:bg-neutral-800 rounded-lg text-[#9ca3af] hover:text-[#f9fafb] transition-all shadow-sm"
                                                title="Reset Admin Password"
                                                disabled={isActionLoading}
                                            >
                                                <KeyRound className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => toggleStatus(business.businessId, business.isActive)}
                                                className={`p-2 hover:bg-[#8b5cf6]/10 rounded-lg transition-all shadow-sm ${business.isActive ? "text-orange-400" : "text-emerald-400"}`}
                                                title={business.isActive ? "Pause Business" : "Resume Business"}
                                                disabled={isActionLoading}
                                            >
                                                {business.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                            </button>
                                            <button 
                                                onClick={() => setShowDeleteModal(business.businessId)}
                                                className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 hover:text-red-400 transition-all shadow-sm"
                                                title="Delete Business"
                                                disabled={isActionLoading}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                            <a 
                                                href={`/business/${business.slug}/admin`}
                                                target="_blank"
                                                className="p-2 hover:bg-[#8b5cf6]/10 rounded-lg text-blue-400 hover:text-blue-300 transition-all shadow-sm"
                                                title="Open Dashboard"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {selectedBusiness && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0b1220] border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 p-8 border-b border-neutral-800 relative">
                            <button 
                                onClick={() => setSelectedBusiness(null)}
                                className="absolute top-6 right-6 p-2 hover:bg-[#8b5cf6]/10 rounded-full transition-all"
                            >
                                <XCircle className="h-6 w-6 text-[#9ca3af] hover:text-[#f9fafb]" />
                            </button>
                            <div className="h-16 w-16 rounded-2xl bg-[#0b1220] border border-[#1f2937] flex items-center justify-center mb-4">
                                <Briefcase className="h-10 w-10 text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white">{selectedBusiness.name}</h2>
                            <p className="text-[#9ca3af] font-mono text-sm leading-relaxed">/{selectedBusiness.slug}</p>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-neutral-800/50 p-6 rounded-2xl border border-[#1f2937]">
                                    <p className="text-xs font-bold text-[#6b7280] uppercase tracking-widest mb-1">Customers</p>
                                    <p className="text-3xl font-black text-white">{selectedBusiness.stats?.customers || 0}</p>
                                </div>
                                <div className="bg-neutral-800/50 p-6 rounded-2xl border border-[#1f2937]">
                                    <p className="text-xs font-bold text-[#6b7280] uppercase tracking-widest mb-1">Transactions</p>
                                    <p className="text-3xl font-black text-white">{selectedBusiness.stats?.transactions || 0}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-3 border-b border-neutral-800 text-sm">
                                    <span className="text-[#6b7280] font-medium">Business ID</span>
                                    <span className="text-[#9ca3af] font-mono">{selectedBusiness.businessId}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-neutral-800 text-sm">
                                    <span className="text-[#6b7280] font-medium">Admin Email</span>
                                    <span className="text-[#9ca3af]">{selectedBusiness.adminEmail}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-neutral-800 text-sm">
                                    <span className="text-[#6b7280] font-medium">Join Date</span>
                                    <span className="text-[#9ca3af]">{new Date(selectedBusiness.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-neutral-800 text-sm">
                                    <span className="text-[#6b7280] font-medium">Contact Phone</span>
                                    <span className="text-[#9ca3af]">{selectedBusiness.phone || "N/A"}</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => setSelectedBusiness(null)}
                                className="w-full py-4 text-sm font-bold bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl transition-all border border-[#1f2937] shadow-inner"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cascade Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in zoom-in-95 duration-200">
                    <div className="bg-[#0b1220] border border-red-500/20 rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50" />
                        <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                            <AlertTriangle className="h-10 w-10 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-black text-white">Permanent Deletion</h2>
                        <p className="text-[#9ca3af] mt-3 text-sm leading-relaxed">
                            This action will **completely purge** this business and all its sub-collections including:
                        </p>
                        <ul className="mt-4 space-y-2 text-xs text-[#6b7280] font-medium list-disc list-inside">
                            <li>Business Transactions & History</li>
                            <li>Customer Profiles & Records</li>
                            <li>Sales, Payments & Stock Ledger</li>
                            <li>Access Accounts for Admins/Operators</li>
                        </ul>
                        <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10 mt-6 text-red-400 text-xs font-bold flex items-center gap-2">
                            <Info className="h-4 w-4 shrink-0" /> IRREVERSIBLE ACTION
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <button 
                                onClick={() => setShowDeleteModal(null)}
                                className="py-3.5 text-sm font-bold bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-all"
                                disabled={isActionLoading}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => deleteBusiness(showDeleteModal)}
                                className="py-3.5 text-sm font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                disabled={isActionLoading}
                            >
                                {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete System"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Result Modal */}
            {resetCreds && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0b1220] border border-green-500/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl overflow-y-auto">
                        <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 p-8 border-b border-neutral-800 relative">
                            <div className="h-16 w-16 rounded-2xl bg-[#0b1220] border border-[#1f2937] flex items-center justify-center mb-4">
                                <KeyRound className="h-10 w-10 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white">Password Reset Successful</h2>
                            <p className="text-[#9ca3af] text-sm mt-2">Please copy these credentials immediately. They will not be shown again.</p>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-[#6b7280] uppercase tracking-widest">Admin Email</label>
                                    <div className="mt-1 p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono text-sm break-all">
                                        {resetCreds.email}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6b7280] uppercase tracking-widest">New Password</label>
                                    <div className="mt-1 p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-green-400 font-mono text-xl tracking-wider text-center font-bold">
                                        {resetCreds.pass}
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setResetCreds(null)}
                                className="w-full py-4 text-sm font-bold bg-green-600 hover:bg-green-500 text-white rounded-2xl transition-all shadow-lg"
                            >
                                I Have Copied It
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
