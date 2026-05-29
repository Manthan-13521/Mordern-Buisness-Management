"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type DemoLead = {
    _id: string;
    name: string;
    email: string;
    phone: string;
    businessName: string;
    businessType: "pool" | "hostel" | "business" | "other";
    city: string;
    notes: string;
    source: string;
    status: "new" | "contacted" | "scheduled" | "closed";
    createdAt: string;
};

export default function SuperAdminDemoPage() {
    const [leads, setLeads] = useState<DemoLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("all");
    const [search, setSearch] = useState("");

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/superadmin/demo?status=${filterStatus}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setLeads(data);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [filterStatus]);

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            const res = await fetch("/api/superadmin/demo", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: id, status }),
            });
            if (!res.ok) throw new Error("Update failed");
            toast.success("Status updated");
            fetchLeads();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors = {
            "new": "bg-blue-500/20 text-blue-400 border border-blue-500/30",
            "contacted": "bg-amber-500/20 text-amber-400 border border-amber-500/30",
            "scheduled": "bg-purple-500/20 text-purple-400 border border-purple-500/30",
            "closed": "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
        } as any;
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>{status}</span>;
    };

    const TypeBadge = ({ type }: { type: string }) => {
        const colors = {
            "pool": "bg-cyan-500/20 text-cyan-400",
            "hostel": "bg-orange-500/20 text-orange-400",
            "business": "bg-violet-500/20 text-violet-400",
            "other": "bg-gray-500/20 text-gray-400",
        } as any;
        return <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${colors[type]}`}>{type}</span>;
    };

    const filteredLeads = leads.filter(lead =>
        lead.name.toLowerCase().includes(search.toLowerCase()) ||
        lead.email.toLowerCase().includes(search.toLowerCase()) ||
        lead.businessName.toLowerCase().includes(search.toLowerCase())
    );

    const analytics = {
        newLeads: leads.filter(l => l.status === "new").length,
        contacted: leads.filter(l => l.status === "contacted").length,
        scheduled: leads.filter(l => l.status === "scheduled").length,
        closed: leads.filter(l => l.status === "closed").length,
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Demo Requests</h1>
                <p className="text-[#9ca3af]">Manage incoming demo leads and schedule product walkthroughs.</p>
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0b1220] backdrop-blur-md border border-[#1f2937] p-6 rounded-2xl">
                    <p className="text-sm text-[#9ca3af] font-medium mb-1">New</p>
                    <p className="text-3xl font-bold text-blue-400">{analytics.newLeads}</p>
                </div>
                <div className="bg-[#0b1220] backdrop-blur-md border border-[#1f2937] p-6 rounded-2xl">
                    <p className="text-sm text-[#9ca3af] font-medium mb-1">Contacted</p>
                    <p className="text-3xl font-bold text-amber-400">{analytics.contacted}</p>
                </div>
                <div className="bg-[#0b1220] backdrop-blur-md border border-[#1f2937] p-6 rounded-2xl">
                    <p className="text-sm text-[#9ca3af] font-medium mb-1">Scheduled</p>
                    <p className="text-3xl font-bold text-purple-400">{analytics.scheduled}</p>
                </div>
                <div className="bg-[#0b1220] backdrop-blur-md border border-[#1f2937] p-6 rounded-2xl">
                    <p className="text-sm text-[#9ca3af] font-medium mb-1">Closed</p>
                    <p className="text-3xl font-bold text-emerald-400">{analytics.closed}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center backdrop-blur-md">
                <input
                    type="text"
                    placeholder="Search by name, email, or business..."
                    className="w-full md:w-96 bg-black/40 border border-[#1f2937] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="bg-black/40 border border-[#1f2937] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="all">All Status</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="closed">Closed</option>
                </select>
            </div>

            {/* List */}
            <div className="flex flex-col gap-4">
                {loading ? (
                    <div className="text-[#9ca3af] text-center py-10">Loading demo requests...</div>
                ) : filteredLeads.length === 0 ? (
                    <div className="text-[#9ca3af] text-center py-10 bg-[#0b1220] border border-[#1f2937] rounded-2xl">No demo requests found.</div>
                ) : (
                    filteredLeads.map((lead) => (
                        <div key={lead._id} className="bg-[#0b1220] backdrop-blur-md border border-[#1f2937] rounded-2xl p-6 transition-all hover:bg-[#8b5cf6]/10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-3 items-center flex-wrap">
                                    <TypeBadge type={lead.businessType} />
                                    <h3 className="font-medium text-white">{lead.name}</h3>
                                    <span className="text-xs text-[#6b7280]">{new Date(lead.createdAt).toLocaleString()}</span>
                                </div>
                                <StatusBadge status={lead.status} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-sm">
                                <div>
                                    <span className="text-[#6b7280]">Business: </span>
                                    <span className="text-[#9ca3af]">{lead.businessName}</span>
                                </div>
                                <div>
                                    <span className="text-[#6b7280]">Email: </span>
                                    <a href={`mailto:${lead.email}`} className="text-blue-400 hover:text-blue-300">{lead.email}</a>
                                </div>
                                <div>
                                    <span className="text-[#6b7280]">Phone: </span>
                                    <a href={`tel:${lead.phone}`} className="text-blue-400 hover:text-blue-300">{lead.phone}</a>
                                </div>
                            </div>

                            {lead.city && (
                                <p className="text-sm text-[#6b7280] mb-2">City: <span className="text-[#9ca3af]">{lead.city}</span></p>
                            )}

                            {lead.notes && (
                                <p className="text-[#9ca3af] text-sm mb-4 bg-black/30 p-4 rounded-xl border border-[#1f2937]">{lead.notes}</p>
                            )}

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-[#6b7280]">Source: <span className="text-[#9ca3af]">{lead.source}</span></span>
                                <select
                                    className="bg-black/60 border border-[#1f2937] rounded-lg px-2 py-1 text-xs text-[#9ca3af] focus:outline-none focus:border-blue-500"
                                    value={lead.status}
                                    onChange={(e) => handleStatusUpdate(lead._id, e.target.value)}
                                >
                                    <option value="new">Set New</option>
                                    <option value="contacted">Set Contacted</option>
                                    <option value="scheduled">Set Scheduled</option>
                                    <option value="closed">Set Closed</option>
                                </select>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
