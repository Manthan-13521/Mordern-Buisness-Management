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
}

export default function NotificationsPage() {
    const [logs, setLogs] = useState<NotificationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState(false);

    const fetchLogs = () => {
        setLoading(true);
        fetch("/api/notifications")
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
                        className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700"
                    >
                        <RefreshCw className="-ml-0.5 mr-1.5 h-4 w-4" />
                        Refresh
                    </button>
                    <button
                        onClick={triggerReminders}
                        disabled={triggering}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                    >
                        <Send className="-ml-0.5 mr-1.5 h-4 w-4" />
                        {triggering ? "Running..." : "Trigger Pending Reminders"}
                    </button>
                </div>
            </div>

            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg dark:ring-white/10">
                            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-800">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Date</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Member</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Phone</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Type</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white max-w-xs">Message</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
                                    {loading ? (
                                        <tr><td colSpan={6} className="py-10 text-center text-gray-500">Loading logs...</td></tr>
                                    ) : logs.length === 0 ? (
                                        <tr><td colSpan={6} className="py-10 text-center text-gray-500">No notifications sent yet.</td></tr>
                                    ) : (
                                        logs.map((log) => (
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
                                                    <span className="inline-flex items-center gap-1">
                                                        <MessageSquare className="w-4 h-4" />
                                                        {log.type.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.message}>
                                                    {log.message}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${log.status === "sent" ? "bg-green-50 text-green-700 ring-green-600/20" : "bg-red-50 text-red-700 ring-red-600/20"
                                                        }`}>
                                                        {log.status.toUpperCase()}
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
