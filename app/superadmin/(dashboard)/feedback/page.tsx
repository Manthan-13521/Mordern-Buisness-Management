"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MessageSquare, Bug, Lightbulb, Search, Filter } from "lucide-react";

import { SAPageHeader } from "@/components/superadmin/ui/SAPageHeader";
import { SACard } from "@/components/superadmin/ui/SACard";
import { SAKpiCard } from "@/components/superadmin/ui/SAKpiCard";
import { SABadge } from "@/components/superadmin/ui/SABadge";
import { SAInput } from "@/components/superadmin/ui/SAInput";

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
        if (status === "open") return <SABadge variant="danger">Open</SABadge>;
        if (status === "in-progress") return <SABadge variant="warning">In Progress</SABadge>;
        if (status === "resolved") return <SABadge variant="success">Resolved</SABadge>;
        return <SABadge>{status}</SABadge>;
    };

    const TypeBadge = ({ type }: { type: string }) => {
        if (type === "bug") return <SABadge variant="danger" icon={<Bug className="w-3 h-3" />}>Bug</SABadge>;
        if (type === "feature") return <SABadge variant="primary" icon={<Lightbulb className="w-3 h-3" />}>Feature</SABadge>;
        if (type === "feedback") return <SABadge variant="info" icon={<MessageSquare className="w-3 h-3" />}>Feedback</SABadge>;
        return <SABadge>{type}</SABadge>;
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <SAPageHeader 
                title="User Reports & Feedback"
                description="Manage incoming bug reports, feature requests, and feedback."
                icon={<MessageSquare className="w-6 h-6 text-[var(--sa-accent)]" />}
            />

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SAKpiCard 
                    title="Open Bugs" 
                    value={analytics.openBugs} 
                    icon={<Bug className="w-6 h-6 text-[var(--sa-danger)]" />}
                    trend={{ value: 0, label: "needs attention", isPositive: false }}
                />
                <SAKpiCard 
                    title="Feature Requests" 
                    value={analytics.featureRequests} 
                    icon={<Lightbulb className="w-6 h-6 text-[var(--sa-accent)]" />}
                />
                <SAKpiCard 
                    title="Total Resolved" 
                    value={analytics.totalResolved} 
                    icon={<MessageSquare className="w-6 h-6 text-[var(--sa-success)]" />}
                />
            </div>

            {/* Filters */}
            <div className="bg-[var(--sa-bg-card)] border border-[var(--sa-border)] rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--sa-text-muted)]" />
                    <SAInput 
                        type="text" 
                        placeholder="Search messages or users..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 w-full"
                    />
                </div>
                
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--sa-text-muted)]" />
                        <select 
                            className="w-full md:w-40 appearance-none bg-[var(--sa-bg-elevated)] border border-[var(--sa-border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--sa-text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--sa-accent)] focus:border-transparent transition-all"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="bug">Bugs Only</option>
                            <option value="feature">Features Only</option>
                            <option value="feedback">Feedback Only</option>
                        </select>
                    </div>

                    <div className="relative flex-1 md:flex-none">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--sa-text-muted)]" />
                        <select 
                            className="w-full md:w-40 appearance-none bg-[var(--sa-bg-elevated)] border border-[var(--sa-border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--sa-text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--sa-accent)] focus:border-transparent transition-all"
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
            </div>

            {/* List */}
            <div className="flex flex-col gap-4">
                {loading ? (
                    <div className="text-[var(--sa-text-muted)] text-center py-10 font-medium">Loading reports...</div>
                ) : filteredFeedbacks.length === 0 ? (
                    <div className="text-[var(--sa-text-muted)] text-center py-10 bg-[var(--sa-bg-card)] border border-[var(--sa-border)] rounded-2xl shadow-sm font-medium">No reports found.</div>
                ) : (
                    filteredFeedbacks.map((fb) => (
                        <SACard key={fb._id} padding="lg" className="transition-all hover:border-[var(--sa-accent)] hover:shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-3 items-center">
                                    <TypeBadge type={fb.type} />
                                    <h3 className="font-bold text-[var(--sa-text-primary)] text-lg">{fb.userName}</h3>
                                    <span className="text-xs text-[var(--sa-text-muted)] font-medium">{new Date(fb.createdAt).toLocaleString()}</span>
                                </div>
                                <StatusBadge status={fb.status} />
                            </div>
                            
                            <p className="text-[var(--sa-text-secondary)] text-sm mb-6 bg-[var(--sa-bg-elevated)] p-4 rounded-xl border border-[var(--sa-border-subtle)] leading-relaxed">
                                {fb.message}
                            </p>
                            
                            <div className="flex justify-between items-center text-sm border-t border-[var(--sa-border-subtle)] pt-4">
                                <div className="flex gap-4 items-center">
                                    <span className="text-[var(--sa-text-muted)] font-medium">Page: <span className="text-[var(--sa-text-primary)]">{fb.page}</span></span>
                                    {fb.screenshot && (
                                        <a href={fb.screenshot} target="_blank" rel="noreferrer" className="text-[var(--sa-info)] hover:text-[var(--sa-info-hover)] font-semibold underline underline-offset-4 transition-colors">
                                            View Screenshot
                                        </a>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <select 
                                        className="bg-[var(--sa-bg-elevated)] border border-[var(--sa-border)] rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--sa-text-primary)] focus:outline-none focus:border-[var(--sa-accent)] cursor-pointer transition-colors"
                                        value={fb.status}
                                        onChange={(e) => handleUpdate(fb._id, { status: e.target.value })}
                                    >
                                        <option value="open">Set Open</option>
                                        <option value="in-progress">Set In Progress</option>
                                        <option value="resolved">Set Resolved</option>
                                    </select>
                                </div>
                            </div>
                        </SACard>
                    ))
                )}
            </div>
        </div>
    );
}
