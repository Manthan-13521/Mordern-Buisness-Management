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
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Notifications</h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        View history of all WhatsApp & SMS reminders sent to members.
                    </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex space-x-3">
                    <button
                        onClick={fetchLogs}
                        className="inline-flex items-center rounded-md bg-background px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-medium"
                    >
                        <RefreshCw className="-ml-0.5 mr-1.5 h-4 w-4" />
                        Refresh
                    </button>
                    <button
                        onClick={triggerReminders}
                        disabled={triggering}
                        className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-50 dark:hover:bg-blue-500/100 disabled:opacity-50"
                    >
                        <Send className="-ml-0.5 mr-1.5 h-4 w-4" />
                        {triggering ? "Running..." : "Trigger Pending Reminders"}
                    </button>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 bg-background/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <label htmlFor="filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Filter by Alert Type:
                    </label>
                    <select
                        id="filter"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="block w-full rounded-md border border-gray-300 dark:border-gray-700 py-1.5 pl-3 pr-10 text-gray-900 focus:ring-2 focus:ring-blue-500 sm:text-sm sm:leading-6 bg-background shadow-sm dark:text-gray-100"
                    >
                        <option value="all">All Notifications</option>
                        <option value="expiry_next_day">Next Day Expiry Alerts</option>
                        <option value="reminder">Reminders (2 Days Before)</option>
                        <option value="on_expiry">Expiry Day Alerts</option>
                    </select>
                </div>
                <div className="text-xs text-gray-500">
                    Showing {filterType === "all" ? logs.length : logs.filter(l => l.actionType === filterType).length} items
                </div>
            </div>

            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg dark:ring-white/10">
                            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-800">
                                <thead className="bg-background">
                                    <tr>
                                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Date</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Member</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Phone</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Module</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Type</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white max-w-xs">Message</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-background dark:divide-gray-800">
                                    {loading ? (
                                        <tr><td colSpan={7} className="py-10 text-center text-gray-500">Loading logs...</td></tr>
                                    ) : (filterType === "all" ? logs : logs.filter(l => l.actionType === filterType)).length === 0 ? (
                                        <tr><td colSpan={7} className="py-10 text-center text-gray-500">No notifications matching this filter.</td></tr>
                                    ) : (
                                        (filterType === "all" ? logs : logs.filter(l => l.actionType === filterType)).map((log) => (
                                            <tr key={log._id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
                                                    {new Date(log.date).toLocaleString()}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                    <div className="flex flex-col">
                                                        <span>{log.memberId?.name || "N/A"}</span>
                                                        <span className="text-xs text-gray-500">{log.memberId?.memberId}</span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {log.memberId?.phone || "N/A"}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset ${
                                                        log.module === "hostel" 
                                                            ? "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/10 dark:text-amber-400" 
                                                            : "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/10 dark:text-blue-400"
                                                    }`}>
                                                        {log.module || "pool"}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                            {log.type.toUpperCase()}
                                                        </span>
                                                        {log.actionType && (
                                                            <span className="text-[10px] text-blue-500 dark:text-indigo-400 font-bold uppercase tracking-tight">
                                                                {log.actionType.replace(/_/g, ' ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.message}>
                                                    {log.message}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ${
                                                        log.status === "sent" 
                                                            ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/10 dark:text-green-400" 
                                                            : "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/10 dark:text-red-400"
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
