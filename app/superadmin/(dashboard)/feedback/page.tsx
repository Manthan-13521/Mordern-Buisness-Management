"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Feedback = {
    _id: string;
    userName: string;
    userId: string;
    type: "bug" | "feedback" | "feature";
    message: string;
    screenshot: string;
    page: string;
    status: "open" | "in-progress" | "resolved";
    priority: "low" | "medium" | "high";
    createdAt: string;
};

export default function SuperAdminFeedbackPage() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [search, setSearch] = useState("");

    const fetchFeedbacks = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/superadmin/feedback?type=${filterType}&status=${filterStatus}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setFeedbacks(data);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, [filterType, filterStatus]);

    const handleUpdate = async (id: string, updates: any) => {
        try {
            const res = await fetch("/api/superadmin/feedback", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: id, ...updates }),
            });
            if (!res.ok) throw new Error("Update failed");
            toast.success("Updated successfully");
            fetchFeedbacks();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors = {
            "open": "bg-red-500/20 text-red-400 border border-red-500/30",
            "in-progress": "bg-amber-500/20 text-amber-400 border border-amber-500/30",
            "resolved": "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
        } as any;
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>{status}</span>;
    };

    const TypeBadge = ({ type }: { type: string }) => {
        const colors = {
            "bug": "bg-rose-500/20 text-rose-400",
            "feature": "bg-purple-500/20 text-purple-400",
            "feedback": "bg-blue-500/20 text-blue-400",
        } as any;
        return <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${colors[type]}`}>{type}</span>;
    };

    const filteredFeedbacks = feedbacks.filter(fb => 
        fb.message.toLowerCase().includes(search.toLowerCase()) || 
        fb.userName.toLowerCase().includes(search.toLowerCase())
    );

    // Analytics Calculation
    const analytics = {
        openBugs: feedbacks.filter(f => f.type === 'bug' && f.status === 'open').length,
        totalResolved: feedbacks.filter(f => f.status === 'resolved').length,
        featureRequests: feedbacks.filter(f => f.type === 'feature').length
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">User Reports & Feedback</h1>
                <p className="text-[#9ca3af]">Manage incoming bug reports, feature requests, and feedback.</p>
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0b1220] backdrop-blur-md border border-[#1f2937] p-6 rounded-2xl">
                    <p className="text-sm text-[#9ca3af] font-medium mb-1">Open Bugs</p>
                    <p className="text-3xl font-bold text-rose-400">{analytics.openBugs}</p>
                </div>
                <div className="bg-[#0b1220] backdrop-blur-md border border-[#1f2937] p-6 rounded-2xl">
                    <p className="text-sm text-[#9ca3af] font-medium mb-1">Feature Requests</p>
                    <p className="text-3xl font-bold text-purple-400">{analytics.featureRequests}</p>
                </div>
                <div className="bg-[#0b1220] backdrop-blur-md border border-[#1f2937] p-6 rounded-2xl">
                    <p className="text-sm text-[#9ca3af] font-medium mb-1">Total Resolved</p>
                    <p className="text-3xl font-bold text-emerald-400">{analytics.totalResolved}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center backdrop-blur-md">
                <input 
                    type="text" 
                    placeholder="Search messages or users..." 
                    className="w-full md:w-96 bg-black/40 border border-[#1f2937] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                
                <div className="flex gap-4">
                    <select 
                        className="bg-black/40 border border-[#1f2937] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="bug">Bugs Only</option>
                        <option value="feature">Features Only</option>
                        <option value="feedback">Feedback Only</option>
                    </select>

                    <select 
                        className="bg-black/40 border border-[#1f2937] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="flex flex-col gap-4">
                {loading ? (
                    <div className="text-[#9ca3af] text-center py-10">Loading reports...</div>
                ) : filteredFeedbacks.length === 0 ? (
                    <div className="text-[#9ca3af] text-center py-10 bg-[#0b1220] border border-[#1f2937] rounded-2xl">No reports found.</div>
                ) : (
                    filteredFeedbacks.map((fb) => (
                        <div key={fb._id} className="bg-[#0b1220] backdrop-blur-md border border-[#1f2937] rounded-2xl p-6 transition-all hover:bg-[#8b5cf6]/10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-3 items-center">
                                    <TypeBadge type={fb.type} />
                                    <h3 className="font-medium text-white">{fb.userName}</h3>
                                    <span className="text-xs text-[#6b7280]">{new Date(fb.createdAt).toLocaleString()}</span>
                                </div>
                                <StatusBadge status={fb.status} />
                            </div>
                            
                            <p className="text-[#9ca3af] text-sm mb-4 bg-black/30 p-4 rounded-xl border border-[#1f2937]">{fb.message}</p>
                            
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex gap-4">
                                    <span className="text-[#6b7280]">Page: <span className="text-[#9ca3af]">{fb.page}</span></span>
                                    {fb.screenshot && (
                                        <a href={fb.screenshot} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
                                            View Screenshot
                                        </a>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <select 
                                        className="bg-black/60 border border-[#1f2937] rounded-lg px-2 py-1 text-xs text-[#9ca3af] focus:outline-none focus:border-blue-500"
                                        value={fb.status}
                                        onChange={(e) => handleUpdate(fb._id, { status: e.target.value })}
                                    >
                                        <option value="open">Set Open</option>
                                        <option value="in-progress">Set In Progress</option>
                                        <option value="resolved">Set Resolved</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
