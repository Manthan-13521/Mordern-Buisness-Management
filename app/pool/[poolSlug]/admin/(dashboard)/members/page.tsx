"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { AddMemberModal } from "./AddMemberModal";
import { Plus, Search, Download, Printer, ChevronLeft, ChevronRight, RefreshCw, User as UserIcon } from "lucide-react";
import Image from "next/image";
import { useThermalPrint } from "@/components/printing/useThermalPrint";
import { PrinterAppsHelp } from "@/components/printing/PrinterAppsHelp";
import { PRIVATE_API_STALE_MS, membersListQueryKeyPrefix } from "@/lib/apiCache";
import { usePoolType } from "@/components/pool/PoolTypeContext";
import { PoolTypeFilter } from "@/components/pool/PoolTypeFilter";
import { addMemberLocal, getMembersByPoolLocal, syncUnsyncedMembers, getLastSyncedAtLocal, setLastSyncedAtLocal, cleanupLocalDB, deleteMemberLocal } from "@/lib/local-db/members.repo";

interface Plan {
    _id: string;
    name: string;
    price: number;
    hasTokenPrint?: boolean;
    quickDelete?: boolean;
    durationDays?: number;
    durationHours?: number;
    durationMinutes?: number;
}

interface EquipmentItem {
    _id: string;
    itemName: string;
    isReturned: boolean;
}

interface Member {
    _id: string;
    memberId: string;
    name: string;
    phone: string;
    age?: number;
    planId: Plan;
    planQuantity: number;
    planEndDate: string;
    expiryDate?: string;
    isExpired: boolean;
    isDeleted: boolean;
    photoUrl?: string;
    paidAmount: number;
    balanceAmount: number;
    paymentStatus: "paid" | "partial" | "pending";
    equipmentTaken: EquipmentItem[];
    createdAt: string;
    cardStatus?: "pending" | "ready";
    defaulterStatus?: "active" | "warning" | "blocked";
    overdueDays?: number;
    // Server-computed verdict fields
    verdict: "ACTIVE" | "EXPIRING" | "EXPIRED" | "DELETED" | "BLOCKED" | "WARNING";
    daysLeft: number;
    verdictClass: string;
    rowClass: string;
    daysLeftLabel: string;
}

// Verdict computation is now done server-side in the API aggregation pipeline.
// The API returns: verdict, daysLeft, verdictClass, rowClass, daysLeftLabel
// No client-side date calculations needed.

export default function MembersPage() {
    const queryClient = useQueryClient();
    const { data: session } = useSession();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchDebounced, setSearchDebounced] = useState("");
    const { print: printThermal } = useThermalPrint();
    const { selectedType } = usePoolType();

    // --- STEP 3: Local Data State ---
    const [localMembers, setLocalMembers] = useState<Member[] | null>(null);
    const [loadingFromLocal, setLoadingFromLocal] = useState(true);

    useEffect(() => {
        if (!session?.user?.poolId) {
            setLoadingFromLocal(false);
            return;
        }
        
        getMembersByPoolLocal(session.user.poolId)
            .then((data) => {
                if (data && data.length > 0) {
                    setLocalMembers(data as unknown as Member[]);
                }
                setLoadingFromLocal(false);
            })
            .catch((e) => {
                console.error("Local DB load error:", e);
                setLoadingFromLocal(false);
            });
    }, [session?.user?.poolId]);
    // --------------------------------

    const LIMIT = 9;

    const invalidateMembersList = () => {
        queryClient.invalidateQueries({ queryKey: [...membersListQueryKeyPrefix] });
    };

    // --- STEP 4 & 6: BACKGROUND SYNC POLLING & CLEANUP ---
    useEffect(() => {
        if (!session?.user?.poolId) return;

        // Run sync on load and initiate garbage collection
        syncUnsyncedMembers().then(() => invalidateMembersList());
        cleanupLocalDB();

        // Run sync when internet reconnects
        const handleOnline = () => {
            syncUnsyncedMembers().then(() => invalidateMembersList());
        };

        // STEP 6: Hard Interval Retry for Writes
        const retrySyncInterval = setInterval(() => {
            syncUnsyncedMembers().then(() => invalidateMembersList());
        }, 30000); // 30s background sweep

        window.addEventListener("online", handleOnline);
        return () => {
            window.removeEventListener("online", handleOnline);
            clearInterval(retrySyncInterval);
        };
    }, [session?.user?.poolId]);
    // -----------------------------------------------------

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(searchTerm), 400);
        return () => clearTimeout(t);
    }, [searchTerm]);

    // Reset to page 1 when search changes
    useEffect(() => { setPage(1); }, [searchDebounced]);

    const { data, isFetching, error } = useQuery({
        queryKey: [...membersListQueryKeyPrefix, page, searchDebounced, LIMIT, selectedType],
        staleTime: PRIVATE_API_STALE_MS,
        refetchOnMount: true,
        refetchInterval: 15000, // STEP 6: Real-time Polling Engine (15s incrementally pulls API changes into UI)
        placeholderData: keepPreviousData,
        queryFn: async () => {
            const poolId = session?.user?.poolId as string;
            const lastSyncedAt = poolId ? await getLastSyncedAtLocal(poolId) : "0";
            const params = new URLSearchParams({
                page: String(page),
                limit: String(LIMIT),
                type: selectedType,
                updatedAfter: lastSyncedAt,
                ...(searchDebounced ? { search: searchDebounced } : {}),
            });
            const res = await fetch(`/api/members?${params}`, { cache: "no-store" });
            if (!res.ok) throw new Error("Failed to fetch members");
            const json = await res.json();
            const rows = Array.isArray(json) ? json : (json.data ?? []);
            const total = json.meta?.total ?? json.total ?? rows.length;
            
            // --- STEP 5: INCREMENTAL SYNC WITH CONFLICT RESOLUTION ---
            if (session?.user?.poolId) {
                try {
                    const { syncMemberConflictSafe, getMembersByPoolLocal, deleteMemberLocal } = await import("@/lib/local-db/members.repo");
                    await Promise.all(
                        rows.map(async (m: any) => {
                            await syncMemberConflictSafe(m, session.user.poolId as string);
                        })
                    );

                    if (rows.length > 0) {
                        await setLastSyncedAtLocal(session.user.poolId, Date.now().toString());
                    }

                    // Clean stale IndexedDB entries when server confirms empty list (new account)
                    if (rows.length === 0 && page === 1 && !searchDebounced) {
                        try {
                            const locals = await getMembersByPoolLocal(session.user.poolId);
                            if (Array.isArray(locals)) {
                                for (const m of locals) {
                                    if ((m as any).synced !== false) {
                                        await deleteMemberLocal((m as any).id);
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn("Stale local data cleanup failed:", e);
                        }
                    }
                } catch (err) {
                    console.error("Local sync loop error:", err);
                }
            }
            // ---------------------------------------------------------

            return { members: rows as Member[], total };
        },
    });

    const { members, offlineTotal } = useMemo(() => {
        if (data?.members !== undefined) return { members: data.members ?? [], offlineTotal: 0 };
        if (!localMembers) return { members: [], offlineTotal: 0 };
        
        let filtered = localMembers as any[];
        if (searchDebounced) {
            const s = searchDebounced.toLowerCase();
            filtered = filtered.filter((m: any) => 
                (m.name || "").toLowerCase().includes(s) || 
                (m.phone || "").toLowerCase().includes(s) || 
                (m.memberId || "").toLowerCase().includes(s)
            );
        }
        
        const start = (page - 1) * LIMIT;
        return { 
            members: filtered.slice(start, start + LIMIT) as unknown as Member[],
            offlineTotal: filtered.length
        };
    }, [data, localMembers, searchDebounced, page]);

    const total = data?.total ?? offlineTotal;
    const loading = (isFetching && !localMembers) || loadingFromLocal;
    const isUsingLocal = (!data?.members || data.members.length === 0) && localMembers !== null && localMembers.length > 0;
    const pendingSyncCount = localMembers ? localMembers.filter(m => (m as any).synced === false).length : 0;

    // ── Computing view-model attributes (verdict, daysLeft) on the frontend ──
    const processedMembers = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const nowMs = now.getTime();

        return members.map((m: Member) => {
            const endDate = new Date(m.planEndDate || m.expiryDate || 0);
            const msLeft = endDate.getTime() - nowMs;
            
            let verdict: Member["verdict"] = "ACTIVE";
            let verdictClass = "bg-green-500/10 text-green-400 ring-green-600/20";
            let rowClass = "";
            let daysLeftLabel = "";
            let daysLeft = 0;

            if (m.isDeleted) {
                verdict = "DELETED";
                verdictClass = "bg-[#0b1220] text-[#9ca3af] ring-gray-500/20 bg-[#0b1220] border border-[#1f2937] text-[#9ca3af]";
                rowClass = "bg-rose-500/5";
                daysLeftLabel = "Deleted";
            } else if (m.defaulterStatus === "blocked") {
                verdict = "BLOCKED";
                verdictClass = "bg-red-700 text-white ring-red-600/30 shadow animate-pulse";
                rowClass = "bg-rose-500/10 border-l-4 border-rose-500";
                daysLeftLabel = `Blocked: ${m.overdueDays}d overdue`;
            } else if (m.defaulterStatus === "warning") {
                verdict = "WARNING";
                verdictClass = "bg-rose-500/10 text-rose-400 ring-rose-600/30 font-bold border border-rose-500/20";
                rowClass = "bg-rose-500/5 border-l-4 border-rose-400";
                daysLeftLabel = `Warning: ${m.overdueDays}d overdue`;
            } else if (m.isExpired || msLeft <= 0) {
                verdict = "EXPIRED";
                verdictClass = "bg-rose-500/10 text-rose-400 ring-red-600/20";
                rowClass = "bg-rose-500/5";
                daysLeftLabel = "Expired";
            } else {
                daysLeft = Math.ceil(msLeft / 86400000);
                if (daysLeft <= 1) {
                    daysLeftLabel = "Expires today";
                } else {
                    daysLeftLabel = `${daysLeft} days left`;
                }
                if (daysLeft <= 7) {
                    verdict = "EXPIRING";
                    verdictClass = "bg-amber-500/10 text-amber-400 ring-amber-600/20";
                    rowClass = "bg-amber-500/5";
                }
            }

            return {
                ...m,
                _endDate: endDate,
                verdict,
                verdictClass,
                rowClass,
                daysLeftLabel,
                daysLeft
            };
        });
    }, [members]);

    // ── Prefetch next page for instant pagination ──────────────────────
    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(total / LIMIT));
        if (page < totalPages) {
            const nextPage = page + 1;
            queryClient.prefetchQuery({
                queryKey: [...membersListQueryKeyPrefix, nextPage, searchDebounced, LIMIT, selectedType],
                queryFn: async () => {
                    const poolId = session?.user?.poolId as string;
                    const lastSyncedAt = poolId ? await getLastSyncedAtLocal(poolId) : "0";
                    const params = new URLSearchParams({
                        page: String(nextPage),
                        limit: String(LIMIT),
                        type: selectedType,
                        updatedAfter: lastSyncedAt,
                        ...(searchDebounced ? { search: searchDebounced } : {}),
                    });
                    const res = await fetch(`/api/members?${params}`, { cache: "no-store" });
                    if (!res.ok) throw new Error("Failed to fetch members");
                    const json = await res.json();
                    const rows = Array.isArray(json) ? json : (json.data ?? []);
                    const t = json.total ?? rows.length;
                    
                    
                    // --- STEP 5: PREFETCH CONFLICT-SAFE CACHING ---
                    if (session?.user?.poolId) {
                        try {
                            const { syncMemberConflictSafe } = await import("@/lib/local-db/members.repo");
                            await Promise.all(
                                rows.map((m: any) => syncMemberConflictSafe(m, session.user.poolId as string))
                            );
                        } catch (e) {}
                    }
                    // ----------------------------------------------

                    return { members: rows as Member[], total: t };
                },
                staleTime: PRIVATE_API_STALE_MS,
            });
        }
    }, [page, searchDebounced, total, queryClient]);

    // ── Auto-poll when any member has cardStatus === "pending" ──────────
    useEffect(() => {
        const hasPending = members.some((m) => m.cardStatus === "pending");
        if (!hasPending) return;

        const startTime = Date.now();
        const interval = setInterval(() => {
            // Stop after 60 seconds to avoid infinite polling
            if (Date.now() - startTime > 60_000) {
                clearInterval(interval);
                return;
            }
            invalidateMembersList();
        }, 3000);

        return () => clearInterval(interval);
    }, [members]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete ${name}? This action cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
            if (res.ok) {
                await deleteMemberLocal(id);
                setLocalMembers((prev) => prev ? prev.filter((m) => m._id !== id) : null);
                invalidateMembersList();
            } else {
                alert((await res.json()).error || "Failed to delete member");
            }
        } catch { alert("Server error"); }
    };

    const handleReprint = (member: Member) => {
        const plan = member.planId as Plan;
        printThermal({
            poolName: "Swimming Pool",
            memberId: member.memberId,
            name: member.name,
            age: member.age,
            phone: member.phone,
            planName: plan?.name ?? "N/A",
            planQty: member.planQuantity ?? 1,
            planPrice: plan?.price ?? 0,
            paidAmount: member.paidAmount ?? 0,
            balance: member.balanceAmount ?? 0,
            registeredAt: new Date(member.createdAt),
            validTill: new Date(member.planEndDate || member.expiryDate || ""),
        });
    };

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-[#f9fafb]">Members</h1>
                    <p className="mt-1 text-sm text-[#9ca3af]">
                        {total.toLocaleString()} total members found
                    </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 flex flex-wrap items-center gap-3">
                    <PoolTypeFilter />
                    <a
                        href={`/api/export/members?type=${selectedType}`}
                        className="inline-flex items-center rounded-md bg-[#0b1220] border border-[#1f2937] px-3 py-2 text-sm font-semibold text-[#9ca3af] shadow-sm hover:bg-[#8b5cf6]/10 transition-colors"
                    >
                        <Download className="-ml-0.5 mr-1.5 h-4 w-4 text-[#6b7280]" />
                        Export
                    </a>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center rounded-md bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 px-3 py-2 text-sm font-semibold text-white shadow-sm "
                    >
                        <Plus className="-ml-0.5 mr-1.5 h-4 w-4" />
                        Add Member
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
                <input
                    type="text"
                    className="block w-full rounded-md border border-[#1f2937] bg-[#0b1220] py-2 pl-9 pr-3 text-sm text-white placeholder-white/40 focus:ring-2 focus:ring-[#8b5cf6] transition shadow-sm"
                    placeholder="Search name, ID, phone…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Legend & Status */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-[#9ca3af]">
                    <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-rose-500/10 border border-rose-500/20" /> Expired / Deleted</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-amber-500/10 border border-amber-500/20" /> Expiring ≤ 7 days</span>
                    <PrinterAppsHelp />
                </div>
                {pendingSyncCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-400 bg-orange-500/10 px-2 py-1.5 rounded-md border border-orange-500/20 shadow-sm">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin duration-3000" />
                        <span>Sync pending ({pendingSyncCount})</span>
                        <span className="opacity-80 hidden sm:inline">— Offline changes not uploaded</span>
                    </div>
                )}
                {isUsingLocal && pendingSyncCount === 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-500/10 px-2 py-1.5 rounded-md border border-amber-500/20 shadow-sm">
                        <RefreshCw className="h-3 w-3 animate-spin duration-3000" />
                        <span>Showing Offline Data</span>
                    </div>
                )}
            </div>

            {error && (
                <p className="text-sm text-rose-500" role="alert">
                    {(error as Error).message || "Could not load members."}
                </p>
            )}

            {/* Table */}
            <div className="flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden shadow-lg border border-[#1f2937] rounded-lg">
                            <table className="min-w-full divide-y divide-[#1f2937]">
                                <thead className="bg-[#0b1220]">
                                    <tr>
                                        {["Member", "Phone", "Plan / Qty", "Equipment", "Balance", "Valid Till", "Status", ""].map((h) => (
                                            <th key={h} className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-[#9ca3af] first:pl-6">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1f2937] bg-[#0b1220]">
                                    {loading ? (
                                        <tr><td colSpan={8} className="py-12 text-center">
                                            <RefreshCw className="animate-spin h-5 w-5 mx-auto text-blue-500" />
                                        </td></tr>
                                    ) : processedMembers.length === 0 ? (
                                        <tr><td colSpan={8} className="py-12 text-center text-[#6b7280]">No members found.</td></tr>
                                    ) : processedMembers.map((member) => {
                                        const plan = member.planId as Plan;
                                        const unreturned = (member.equipmentTaken ?? []).filter((e: EquipmentItem) => !e.isReturned);
                                        const endDate = member._endDate;

                                        return (
                                            <tr key={member._id} className={`${member.rowClass || ""} transition-colors`}>
                                                {/* Member */}
                                                <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                                                    <a href={`members/${member._id}`} className="flex items-center gap-3 group">
                                                        {member.photoUrl
                                                            ? <Image 
                                                                src={`/api/members/${member._id}/photo`} 
                                                                alt={member.name} 
                                                                width={36} 
                                                                height={36} 
                                                                className="h-9 w-9 rounded-full object-cover ring-1 ring-[#1f2937]"
                                                                loading="lazy"
                                                                quality={40}
                                                              />
                                                            : <div className="h-9 w-9 rounded-full bg-[#0b1220] border border-[#1f2937] flex items-center justify-center shadow-sm">
                                                                <UserIcon className="h-5 w-5 text-[#6b7280]" />
                                                              </div>
                                                        }
                                                        <div>
                                                            <p className="font-medium text-[#f9fafb] group-hover:text-blue-600">{member.name}</p>
                                                            <p className="text-xs text-[#6b7280]">
                                                                {member.memberId}{member.age ? ` · ${member.age} yrs` : ""}
                                                                {(member as any)._source === "entertainment" && (
                                                                    <span className="ml-1.5 inline-flex items-center rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400 ring-1 ring-purple-600/20">🎭</span>
                                                                )}
                                                                {/* STEP 12 SaaS Safety: Admin visibility override */}
                                                                {(member as any).manualOverride && (
                                                                    <span className="ml-1.5 inline-flex items-center rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400 ring-1 ring-indigo-600/20">Manual Override Active</span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </a>
                                                </td>
                                                {/* Phone */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-[#9ca3af]">{member.phone}</td>
                                                {/* Plan / Qty */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <p className="text-[#f9fafb]">{plan?.name ?? "N/A"}</p>
                                                    <p className="text-xs text-[#6b7280]">Qty: {member.planQuantity ?? 1}</p>
                                                </td>
                                                {/* Equipment */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    {unreturned.length > 0
                                                        ? <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-400">
                                                            {unreturned.length} out
                                                        </span>
                                                        : <span className="text-xs text-[#6b7280]">—</span>
                                                    }
                                                </td>
                                                {/* Balance */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium">
                                                    {(member.balanceAmount ?? 0) > 0
                                                        ? <span className="text-rose-500">₹{member.balanceAmount.toLocaleString("en-IN")}</span>
                                                        : <span className="text-[#6b7280]">—</span>
                                                    }
                                                </td>
                                                {/* Valid Till */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-[#9ca3af]">
                                                    <p>{endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                                                    <p className="text-xs text-[#6b7280]">{member.daysLeftLabel}</p>
                                                </td>
                                                {/* Status badge */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${member.verdictClass}`}>{member.verdict}</span>
                                                </td>
                                                {/* Actions */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        {member.cardStatus === "pending" ? (
                                                            <button disabled title="Generating ID Card..." className="p-1.5 rounded-md text-[#9ca3af] cursor-wait">
                                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                            </button>
                                                        ) : (
                                                            <a href={`/api/members/${member._id}/pdf`} download title="Download ID Card"
                                                                className="p-1.5 rounded-md text-[#6b7280] hover:text-blue-600 hover:bg-[#8b5cf6]/10  transition-colors">
                                                                <Download className="h-4 w-4" />
                                                            </a>
                                                        )}
                                                        {plan?.hasTokenPrint && (
                                                            <button onClick={() => handleReprint(member)} title="Reprint Token"
                                                                className="p-1.5 rounded-md text-[#6b7280] hover:text-green-600 hover:bg-green-500/10 hover:bg-green-500/10 transition-colors">
                                                                <Printer className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleDelete(member._id, member.name)} title="Delete Member"
                                                            className="p-1.5 rounded-md text-[#6b7280] hover:text-rose-500 hover:bg-rose-500/10 hover:bg-rose-500/10 transition-colors">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-[#1f2937] pt-4">
                <p className="text-sm text-[#9ca3af]">
                    Showing <span className="font-medium">{(page - 1) * LIMIT + 1}</span>–<span className="font-medium">{Math.min(page * LIMIT, total)}</span> of <span className="font-medium">{total}</span>
                </p>
                <div className="flex gap-2">
                    <button
                        disabled={page <= 1 || loading}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#1f2937] bg-[#0b1220] text-[#f9fafb] hover:bg-[#8b5cf6]/5 disabled:bg-[#0b1220] disabled:text-[#6b7280] transition-colors font-medium shadow-sm"
                    >
                        <ChevronLeft className="h-4 w-4" /> Previous
                    </button>
                    <span className="inline-flex items-center px-3 py-2 text-sm text-[#9ca3af]">
                        Page {page} / {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages || loading}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 text-white disabled:bg-[#0b1220] disabled:text-[#6b7280] transition-colors shadow-sm font-medium"
                    >
                        Next <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <AddMemberModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={invalidateMembersList} />
        </div>
    );
}
