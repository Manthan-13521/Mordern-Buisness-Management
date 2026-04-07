"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, ChevronLeft, ChevronRight, RefreshCw, UserCog, Clock, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { useHostelBlock } from "@/components/hostel/HostelBlockContext";
import { HostelBlockFilter } from "@/components/hostel/HostelBlockFilter";

interface StaffMember {
    _id: string;
    staffId: string;
    name: string;
    phone: string;
    role: "Trainer" | "Manager" | "Staff";
    blockName?: string;
    createdAt: string;
}

interface AttendanceLog {
    _id: string;
    staffId: string;
    hostelId: string;
    date: string;
    checkInTime?: string;
    checkOutTime?: string;
    status: string;
    createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
    Trainer: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-800",
    Manager: "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:ring-purple-800",
    Staff:   "bg-gray-50 text-gray-700 ring-gray-200 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg dark:text-gray-400 dark:ring-gray-700",
    Worker:  "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800",
    Cook:    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800",
    Guard:   "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-800",
    Cleaner: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:ring-teal-800",
};

function AddStaffModal({
    blocks,
    onClose,
    onSuccess,
}: {
    blocks: string[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState({ name: "", phone: "", role: "Staff", blockName: "" });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const res = await fetch("/api/hostel/staff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        setSaving(false);
        if (res.ok) { onSuccess(); onClose(); }
        else alert((await res.json()).error || "Failed to add staff");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-6 border border-white/10">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Staff Member</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                        <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                            className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label>
                        <input required type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                            className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Block *</label>
                        <select
                            required
                            value={form.blockName}
                            onChange={e => setForm({ ...form, blockName: e.target.value })}
                            className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Select Block…</option>
                            {blocks.map(b => <option key={b} value={b}>Block {b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                            className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
                            <option value="Staff">Staff</option>
                            <option value="Worker">Worker</option>
                            <option value="Cook">Cook</option>
                            <option value="Guard">Guard</option>
                            <option value="Cleaner">Cleaner</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                            {saving && <RefreshCw className="h-4 w-4 animate-spin" />} Add Staff
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function StaffPage() {
    const { selectedBlock, blocks: contextBlocks } = useHostelBlock();

    const [staff, setStaff]           = useState<StaffMember[]>([]);
    const [total, setTotal]           = useState(0);
    const [page, setPage]             = useState(1);
    const [search, setSearch]         = useState("");
    const [searchD, setSearchD]       = useState("");
    const [loading, setLoading]       = useState(true);
    const [showModal, setShowModal]   = useState(false);
    const [selected, setSelected]     = useState<StaffMember | null>(null);
    const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
    const [attLoading, setAttLoading] = useState(false);

    const now = new Date();
    const LIMIT = 11;

    useEffect(() => {
        const t = setTimeout(() => setSearchD(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    const fetchStaff = useCallback(() => {
        setLoading(true);
        const blockParam = selectedBlock && selectedBlock !== "all"
            ? `&block=${encodeURIComponent(selectedBlock)}`
            : "";
        const params = new URLSearchParams({
            page: String(page),
            limit: String(LIMIT),
            ...(searchD ? { search: searchD } : {}),
        });
        fetch(`/api/hostel/staff?${params}${blockParam}`)
            .then(r => r.json())
            .then(d => { setStaff(d.data ?? []); setTotal(d.total ?? 0); setLoading(false); })
            .catch(() => setLoading(false));
    }, [page, searchD, selectedBlock]);

    useEffect(() => { fetchStaff(); }, [fetchStaff]);
    useEffect(() => { setPage(1); }, [searchD, selectedBlock]);

    const fetchAttendance = useCallback((staffId: string) => {
        setAttLoading(true);
        fetch(`/api/hostel/staff/attendance?staffId=${staffId}&limit=200&days=62`)
            .then(r => r.json())
            .then(d => { setAttendance(d.data ?? []); setAttLoading(false); })
            .catch(() => setAttLoading(false));
    }, []);

    useEffect(() => {
        if (selected) fetchAttendance(selected.staffId);
    }, [selected, fetchAttendance]);

    const handleLogAttendance = async (staffId: string, type: "checkIn" | "checkOut") => {
        const d = new Date();
        const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const res = await fetch("/api/hostel/staff/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId, type, date: localDateStr }),
        });
        if (res.ok) fetchAttendance(staffId);
        else alert((await res.json()).error);
    };

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Staff</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {total} member{total !== 1 ? "s" : ""}
                        {selectedBlock !== "all" && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                Block {selectedBlock}
                            </span>
                        )}
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center gap-3">
                    <HostelBlockFilter />
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 px-4 py-2.5 text-sm font-semibold text-white shadow"
                    >
                        <Plus className="h-4 w-4" /> Add Staff
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder="Search name, ID, phone…" value={search} onChange={e => setSearch(e.target.value)}
                    className="block w-full rounded-md border-0 py-2 pl-9 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 sm:text-sm bg-white dark:bg-white/5 dark:border dark:border-white/10 shadow-lg dark:text-white dark:ring-gray-700" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Staff Table */}
                <div className="lg:col-span-2 overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg dark:ring-white/10">
                    <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-white/5">
                            <tr>
                                {["Staff Member", "Block", "Role", "Phone", ""].map(h => (
                                    <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 first:pl-6">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-white/5">
                            {loading ? (
                                <tr><td colSpan={5} className="py-10 text-center"><RefreshCw className="animate-spin h-5 w-5 mx-auto text-blue-500" /></td></tr>
                            ) : staff.length === 0 ? (
                                <tr><td colSpan={5} className="py-12 text-center text-gray-500">
                                    {selectedBlock !== "all" ? `No staff found in Block ${selectedBlock}.` : "No staff found."}
                                </td></tr>
                            ) : staff.map(s => (
                                <tr
                                    key={s._id}
                                    className={`hover:bg-gray-50 dark:hover:bg-black/50 cursor-pointer transition-colors ${selected?._id === s._id ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}
                                    onClick={() => { setSelected(s); fetchAttendance(s.staffId); }}
                                >
                                    <td className="py-4 pl-6 pr-3 text-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                                                <span className="text-indigo-700 dark:text-indigo-300 font-bold text-sm">{s.name.charAt(0).toUpperCase()}</span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
                                                <p className="text-xs text-gray-400">{s.staffId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        {s.blockName ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">
                                                Block {s.blockName}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-sm">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${ROLE_COLORS[s.role]}`}>{s.role}</span>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{s.phone}</td>
                                    <td className="px-4 py-4 text-sm text-right space-x-3">
                                        <UserCog className="h-4 w-4 text-gray-400 inline cursor-pointer hover:text-blue-600 dark:text-blue-400" />
                                        <Trash2
                                            className="h-4 w-4 text-gray-400 inline cursor-pointer hover:text-red-600"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`Delete staff member ${s.name}?`)) {
                                                    fetch(`/api/hostel/staff/${s._id}`, { method: "DELETE" })
                                                        .then(res => {
                                                            if (res.ok) {
                                                                fetchStaff();
                                                                if (selected?.staffId === s.staffId) setSelected(null);
                                                            } else {
                                                                res.json().then(data => alert(data.error || "Failed to delete"));
                                                            }
                                                        });
                                                }
                                            }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {/* Pagination */}
                    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 px-4 py-3">
                        <p className="text-sm text-gray-500">Page {page}/{totalPages}</p>
                        <div className="flex gap-2">
                            <button
                                disabled={page <= 1 || loading}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors font-medium shadow-sm"
                            >
                                <ChevronLeft className="h-4 w-4"/> Previous
                            </button>
                            <button
                                disabled={page >= totalPages || loading}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 text-white disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 transition-colors shadow-sm font-medium"
                            >
                                Next <ChevronRight className="h-4 w-4"/>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Attendance Sidebar */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/5 dark:backdrop-blur-md shadow-sm overflow-y-auto max-h-[80vh]">
                    {selected ? (
                        <>
                            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{selected.name}</p>
                                <p className="text-xs text-gray-400">{selected.staffId} · {selected.role}{selected.blockName ? ` · Block ${selected.blockName}` : ""}</p>
                            </div>
                            {/* Quick Check-in/out */}
                            <div className="px-5 py-3 flex gap-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-slate-900/30">
                                <button onClick={() => handleLogAttendance(selected.staffId, "checkIn")}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-500">
                                    <CheckCircle className="h-3.5 w-3.5" /> Check In
                                </button>
                                <button onClick={() => handleLogAttendance(selected.staffId, "checkOut")}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500">
                                    <XCircle className="h-3.5 w-3.5" /> Check Out
                                </button>
                            </div>
                            {/* Dual-Month Attendance */}
                            <div className="px-5 py-3 space-y-4">
                                {attLoading ? (
                                    <div className="text-center py-4"><RefreshCw className="animate-spin h-4 w-4 mx-auto text-blue-500" /></div>
                                ) : (() => {
                                    const todayDate = now.getDate();
                                    const curMonth  = now.getMonth();
                                    const curYear   = now.getFullYear();
                                    const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
                                    const prevYear  = curMonth === 0 ? curYear - 1 : curYear;

                                    const renderMonth = (calYear: number, calMonth: number, isCurrent: boolean) => {
                                        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                                        const maxDay      = isCurrent ? todayDate : daysInMonth;
                                        const monthLabel  = new Date(calYear, calMonth).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

                                        const dayMap: Record<number, { checkIn: boolean; checkOut: boolean }> = {};
                                        attendance.forEach(log => {
                                            const d = new Date(log.date);
                                            if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
                                                dayMap[d.getDate()] = { checkIn: !!log.checkInTime, checkOut: !!log.checkOutTime };
                                            }
                                        });

                                        let presentCount = 0;
                                        for (let d = 1; d <= maxDay; d++) {
                                            if (dayMap[d]?.checkIn) presentCount++;
                                        }

                                        return (
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 text-center">📅 {monthLabel}</p>
                                                <div className="grid grid-cols-7 gap-1">
                                                    {["S","M","T","W","T","F","S"].map((d, i) => (
                                                        <span key={i} className="text-center text-[9px] font-bold text-gray-400 uppercase">{d}</span>
                                                    ))}
                                                    {Array.from({ length: new Date(calYear, calMonth, 1).getDay() }).map((_, i) => (
                                                        <span key={`e${i}`} />
                                                    ))}
                                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                                        const day     = i + 1;
                                                        const isFuture = day > maxDay;
                                                        const rec     = dayMap[day];
                                                        let bg = "bg-gray-100 dark:bg-white/5 text-gray-400";
                                                        if (!isFuture) {
                                                            if (rec?.checkIn && rec?.checkOut) bg = "bg-green-500 text-white";
                                                            else if (rec?.checkIn)  bg = "bg-green-400 text-white";
                                                            else if (rec?.checkOut) bg = "bg-amber-400 text-white";
                                                            else bg = "bg-red-100 dark:bg-red-900/30 text-red-500";
                                                        }
                                                        const isToday = isCurrent && day === todayDate;
                                                        return (
                                                            <span key={day}
                                                                className={`flex items-center justify-center h-6 w-6 rounded text-[10px] font-semibold ${bg} ${isToday ? "ring-2 ring-indigo-500" : ""} ${isFuture ? "opacity-40" : ""}`}
                                                                title={isFuture ? "" : rec?.checkIn ? (rec?.checkOut ? "In & Out" : "Checked In") : rec?.checkOut ? "Only Out" : "Absent"}
                                                            >
                                                                {day}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex items-center gap-3 pt-1 border-t border-gray-100 dark:border-gray-800">
                                                    <span className="text-[10px] text-green-600 font-semibold">✓ Present: {presentCount}</span>
                                                    <span className="text-[10px] text-red-500 font-semibold">✗ Absent: {maxDay - presentCount}</span>
                                                </div>
                                            </div>
                                        );
                                    };

                                    return (
                                        <>
                                            {renderMonth(curYear, curMonth, true)}
                                            <hr className="border-gray-200 dark:border-gray-800" />
                                            {renderMonth(prevYear, prevMonth, false)}
                                        </>
                                    );
                                })()}
                                {/* Legend */}
                                <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-1">
                                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-green-500" /> In+Out</span>
                                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-green-400" /> In only</span>
                                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-red-100 dark:bg-red-900/30 border border-red-200" /> Absent</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                            <UserCog className="h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
                            <p className="text-sm text-gray-500">Select a staff member to view attendance and log check-in/out</p>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <AddStaffModal
                    blocks={contextBlocks}
                    onClose={() => setShowModal(false)}
                    onSuccess={fetchStaff}
                />
            )}
        </div>
    );
}
