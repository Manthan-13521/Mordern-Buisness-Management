"use client";

import { useState, useEffect } from "react";
import { AddMemberModal } from "./AddMemberModal";
import { Plus, Search, Download } from "lucide-react";


interface Member {
    _id: string;
    memberId: string;
    name: string;
    phone: string;
    status: string;
    planId: { name: string };
    expiryDate: string;
    photoUrl?: string;
}

export default function MembersPage() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchMembers = () => {
        fetch("/api/members")
            .then((res) => res.json())
            .then((data) => {
                setMembers(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch members", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        // Initial state is already loading=true
        fetchMembers();
    }, []);

    const filteredMembers = members.filter(
        (m) =>
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.phone.includes(searchTerm)
    );

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you absolutely sure you want to delete ${name}? This action cannot be undone.`)) return;

        try {
            setLoading(true);
            const res = await fetch(`/api/members/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                fetchMembers();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to delete member");
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            alert("Server error connecting to deletion route");
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Members</h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        A list of all the members including their name, plan, status, and expiry date.
                    </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex space-x-3">
                    <button
                        type="button"
                        className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700"
                    >
                        <Download className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
                        Export Excel
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        type="button"
                        className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        <Plus className="-ml-0.5 mr-1.5 h-5 w-5 inline" aria-hidden="true" />
                        Add Member
                    </button>
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700"
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg dark:ring-white/10">
                            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-800">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
                                            Member
                                        </th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Contact
                                        </th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Plan
                                        </th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Status
                                        </th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Expiry Date
                                        </th>
                                        <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="py-10 text-center text-gray-500">
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : filteredMembers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-10 text-center text-gray-500">
                                                No members found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMembers.map((member) => (
                                            <tr key={member._id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 flex-shrink-0">
                                                            {member.photoUrl ? (
                                                                <img className="h-10 w-10 rounded-full object-cover shadow-sm bg-gray-100" src={member.photoUrl} alt="" />
                                                            ) : (
                                                                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                                                                    <span className="text-indigo-700 dark:text-indigo-300 font-bold uppercase">{member.name.charAt(0)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="ml-4 flex flex-col">
                                                            <span>{member.name}</span>
                                                            <span className="text-xs text-gray-500">{member.memberId}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {member.phone}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {member.planId?.name || "N/A"}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <span
                                                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${member.status === "active"
                                                            ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400"
                                                            : member.status === "expired"
                                                                ? "bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-500/10 dark:text-red-400"
                                                                : "bg-gray-50 text-gray-600 ring-gray-500/10"
                                                            }`}
                                                    >
                                                        {member.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(member.expiryDate).toLocaleDateString()}
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <a
                                                        href={`/api/members/${member._id}/pdf`}
                                                        download
                                                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                                                        title="Download ID Card"
                                                    >
                                                        <Download className="h-5 w-5 inline" />
                                                    </a>
                                                    <button
                                                        className="text-red-500 hover:text-red-700 ml-2"
                                                        title="Delete Member"
                                                        onClick={() => handleDelete(member._id, member.name)}
                                                    >
                                                        <span className="sr-only">Delete</span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2 inline"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                                    </button>
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

            <AddMemberModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchMembers}
            />
        </div>
    );
}
