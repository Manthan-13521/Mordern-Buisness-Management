"use client";

import { useState, useEffect } from "react";
import { MessageSquare, RefreshCw, Send } from "lucide-react";


interface NotificationLog {
    _id: string;
    memberId: { name: string; memberId: string; phone: string };
    type: string;
    message: string;
    status: string;
    date: string;
    module?: "pool" | "hostel";
    actionType?: string;
}

export default function NotificationsPage() {
    const [logs, setLogs] = useState<NotificationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState(false);
    const [filterType, setFilterType] = useState<string>("all");

    const fetchLogs = () => {
        setLoading(true);
        fetch("/api/notifications", { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                setLogs(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const triggerReminders = async () => {
        if (!confirm("Are you sure you want to manually trigger the WhatsApp reminders for all members expiring in exactly 2 days?")) return;

        setTriggering(true);
        try {
            const res = await fetch("/api/notifications/reminders", {
                method: "POST",
            });
            const data = await res.json();

            if (res.ok) {
                alert(`Successfully sent ${data.sentSuccessfully} reminders out of ${data.totalFound} found.`);
                fetchLogs();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to trigger reminders.");
        } finally {
            setTriggering(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-[#f9fafb]">Notifications</h1>
                    <p className="mt-2 text-sm text-[#9ca3af]">
                        View history of all WhatsApp & SMS reminders sent to members.
                    </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex space-x-3">
                    <button
                        onClick={fetchLogs}
                        className="inline-flex items-center rounded-md bg-[#0b1220] px-3 py-2 text-sm font-semibold text-[#f9fafb] shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-[#0b1220] hover:bg-[#8b5cf6]/5 transition-all font-medium"
                    >
                        <RefreshCw className="-ml-0.5 mr-1.5 h-4 w-4" />
                        Refresh
                    </button>
                    <button
                        onClick={triggerReminders}
                        disabled={triggering}
                        className="inline-flex items-center rounded-md bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 px-3 py-2 text-sm font-semibold text-white shadow-sm  disabled:opacity-50"
                    >
                        <Send className="-ml-0.5 mr-1.5 h-4 w-4" />
                        {triggering ? "Running..." : "Trigger Pending Reminders"}
                    </button>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 bg-[#0b1220]/50 p-4 rounded-xl border border-[#1f2937]">
                <div className="flex items-center gap-2">
                    <label htmlFor="filter" className="text-sm font-medium text-[#9ca3af]">
                        Filter by Alert Type:
                    </label>
                    <select
                        id="filter"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="block w-full rounded-md border border-[#1f2937] border-[#1f2937] py-1.5 pl-3 pr-10 text-[#f9fafb] focus:ring-2 focus:ring-[#8b5cf6] sm:text-sm sm:leading-6 bg-[#0b1220] shadow-sm dark:text-gray-100"
                    >
                        <option value="all">All Notifications</option>
                        <option value="expiry_next_day">Next Day Expiry Alerts</option>
                        <option value="reminder">Reminders (2 Days Before)</option>
                        <option value="on_expiry">Expiry Day Alerts</option>
                    </select>
                </div>
                <div className="text-xs text-[#6b7280]">
                    Showing {filterType === "all" ? logs.length : logs.filter(l => l.actionType === filterType).length} items
                </div>
            </div>

            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg dark:ring-white/10">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-[#0b1220]">
                                    <tr>
                                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-[#f9fafb] sm:pl-6">Date</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-[#f9fafb]">Member</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-[#f9fafb]">Phone</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-[#f9fafb]">Module</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-[#f9fafb]">Type</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-[#f9fafb] max-w-xs">Message</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-[#f9fafb]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1f2937] bg-[#0b1220]">
                                    {loading ? (
                                        <tr><td colSpan={7} className="py-10 text-center text-[#6b7280]">Loading logs...</td></tr>
                                    ) : (filterType === "all" ? logs : logs.filter(l => l.actionType === filterType)).length === 0 ? (
                                        <tr><td colSpan={7} className="py-10 text-center text-[#6b7280]">No notifications matching this filter.</td></tr>
                                    ) : (
                                        (filterType === "all" ? logs : logs.filter(l => l.actionType === filterType)).map((log) => (
                                            <tr key={log._id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-[#6b7280] sm:pl-6">
                                                    {new Date(log.date).toLocaleString()}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-[#f9fafb]">
                                                    <div className="flex flex-col">
                                                        <span>{log.memberId?.name || "N/A"}</span>
                                                        <span className="text-xs text-[#6b7280]">{log.memberId?.memberId}</span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-[#6b7280]">
                                                    {log.memberId?.phone || "N/A"}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-[#6b7280]">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset ${
                                                        log.module === "hostel" 
                                                            ? "bg-amber-500/10 text-amber-400 ring-amber-600/20 dark:bg-amber-900/10" 
                                                            : "bg-blue-500/10 text-blue-400 ring-blue-600/20 dark:bg-blue-900/10"
                                                    }`}>
                                                        {log.module || "pool"}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-[#6b7280]">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="inline-flex items-center gap-1 font-medium text-[#9ca3af]">
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                            {log.type.toUpperCase()}
                                                        </span>
                                                        {log.actionType && (
                                                            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">
                                                                {log.actionType.replace(/_/g, ' ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-4 text-sm text-[#6b7280] max-w-xs truncate" title={log.message}>
                                                    {log.message}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ${
                                                        log.status === "sent" 
                                                            ? "bg-green-500/10 text-green-400 ring-green-600/20 dark:bg-green-900/10" 
                                                            : "bg-red-500/10 text-red-400 ring-red-600/20 dark:bg-red-900/10"
                                                    }`}>
                                                        {log.status === "failed_permanent" ? "FAILED (PERMANENT)" : log.status === "failed" ? "NOTIFICATION FAILED" : "SENT"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
