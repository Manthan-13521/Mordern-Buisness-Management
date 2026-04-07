"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Search, Loader2, ArrowLeft, RefreshCw, Trash2, ShieldAlert } from "lucide-react";
import Swal from "sweetalert2";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface DeletedMember {
    _id: string;
    memberId: string;
    name: string;
    phone: string;
    planId?: { name: string };
    deletedAt?: string;
}

export default function RecycleBinPage() {
    const { data: session } = useSession();
    const [members, setMembers] = useState<DeletedMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchDeletedMembers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/members?deleted=true&limit=100&search=${search}`);
            const json = await res.json();
            if (res.ok) {
                setMembers(json.data || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDeletedMembers();
    }, [search]);

    const handleRestore = async (id: string, name: string) => {
        const result = await Swal.fire({
            title: "Restore Member?",
            text: `Are you sure you want to restore ${name}?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, restore it",
        });

        if (result.isConfirmed) {
            const res = await fetch(`/api/members/${id}/restore`, { method: "POST" });
            if (res.ok) {
                Swal.fire("Restored!", `${name} has been restored successfully.`, "success");
                fetchDeletedMembers();
            } else {
                Swal.fire("Error", "Could not restore member", "error");
            }
        }
    };

    const handlePermanentDelete = async (id: string, name: string) => {
        const result = await Swal.fire({
            title: "PERMANENTLY DELETE?",
            text: `You are about to permanently delete ${name}. This action CANNOT be undone, and associated assets (like photos) will be wiped.`,
            icon: "warning",
            iconColor: "#ef4444",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "I Understand, Delete Everything",
        });

        if (result.isConfirmed) {
            const res = await fetch(`/api/members/${id}/permanent`, { method: "DELETE" });
            if (res.ok) {
                Swal.fire("Deleted!", `${name} has been permanently erased.`, "success");
                fetchDeletedMembers();
            } else {
                Swal.fire("Error", "Could not permanently delete member", "error");
            }
        }
    };

    if (session?.user?.role !== "admin" && session?.user?.role !== "superadmin") {
        return (
            <div className="p-8 text-center text-red-500 flex flex-col items-center justify-center min-h-[400px]">
                <ShieldAlert className="w-16 h-16 mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p>Only Administrators can access the Recycle Bin.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <Link href="/members" className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                            <Trash2 className="w-6 h-6 text-red-500" />
                            Recycle Bin
                        </h1>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-12">
                        Members deleted here are permanently wiped after 30 days.
                    </p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="search"
                        placeholder="Search deleted members..."
                        className="w-full pl-10 pr-4 py-2 border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">ID</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Phone</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Plan</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Deleted At</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : members.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center">
                                        <Trash2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                                        <p>The recycle bin is completely empty.</p>
                                    </td>
                                </tr>
                            ) : (
                                members.map((member) => (
                                    <tr key={member._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">
                                            {member.memberId}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900 dark:text-white">{member.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{member.phone}</td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{member.planId?.name || "N/A"}</td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                            {member.deletedAt ? format(new Date(member.deletedAt), "MMM dd, yyyy HH:mm") : "Unknown"}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleRestore(member._id, member.name)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                    Restore
                                                </button>
                                                <button
                                                    onClick={() => handlePermanentDelete(member._id, member.name)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Permanent
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
