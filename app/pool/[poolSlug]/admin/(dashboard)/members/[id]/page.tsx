"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Trash2, RotateCcw, Download, Package, PackageCheck } from "lucide-react";
import { useThermalPrint } from "@/components/printing/useThermalPrint";
import { PrinterAppsHelp } from "@/components/printing/PrinterAppsHelp";

interface EquipmentItem {
    _id: string;
    itemName: string;
    issuedDate: string;
    returnedDate?: string;
    isReturned: boolean;
}

interface Plan {
    _id: string;
    name: string;
    price: number;
    hasTokenPrint?: boolean;
}

interface Member {
    _id: string;
    memberId: string;
    name: string;
    phone: string;
    age?: number;
    address?: string;
    aadharCard?: string;
    photoUrl?: string;
    planId: Plan;
    planQuantity: number;
    planStartDate?: string;
    planEndDate?: string;
    expiryDate?: string;
    paidAmount: number;
    balanceAmount: number;
    paymentStatus: string;
    equipmentTaken: EquipmentItem[];
    isActive: boolean;
    isExpired: boolean;
    isDeleted: boolean;
    deletedAt?: string;
    deleteReason?: string;
    createdAt: string;
}

function ExpiryBanner({ member }: { member: Member }) {
    if (member.isDeleted) {
        return (
            <div className="rounded-xl bg-slate-900 border border-white/10 px-4 py-4 flex items-center gap-3 shadow-lg">
                <span className="text-2xl">🗑️</span>
                <div>
                    <p className="font-bold text-slate-300">Member Deleted</p>
                    <p className="text-sm text-slate-500">Reason: {member.deleteReason ?? "manual"} · {member.deletedAt ? new Date(member.deletedAt).toLocaleDateString("en-IN") : ""}</p>
                </div>
            </div>
        );
    }

    const endDate = new Date(member.planEndDate || member.expiryDate || "");
    const msLeft = endDate.getTime() - Date.now();
    const isActuallyExpired = member.isExpired || msLeft < 0;
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

    if (isActuallyExpired) {
        return (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-4 flex items-center gap-3 shadow-lg">
                <span className="text-2xl">⚠️</span>
                <div>
                    <p className="font-bold text-rose-400">Plan Expired</p>
                    <p className="text-sm text-rose-400/70">Expired on {endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
                </div>
            </div>
        );
    }

    if (daysLeft <= 7) {
        return (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-4 flex items-center gap-3 shadow-lg">
                <span className="text-2xl">⏰</span>
                <div>
                    <p className="font-bold text-amber-400">Expiring Soon — {daysLeft} day{daysLeft !== 1 ? "s" : ""} left</p>
                    <p className="text-sm text-amber-400/70">Valid till {endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-4 flex items-center gap-3 shadow-lg">
            <span className="text-2xl">✅</span>
            <div>
                <p className="font-bold text-emerald-400">Active — {daysLeft} days remaining</p>
                <p className="text-sm text-emerald-400/70">Valid till {endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
            </div>
        </div>
    );
}

export default function MemberDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { print: printThermal } = useThermalPrint();

    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState("");
    const [issuing, setIssuing] = useState(false);

    const memberId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

    const fetchMember = () => {
        setLoading(true);
        fetch(`/api/members/${memberId}`)
            .then(r => r.json())
            .then(data => { setMember(data); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { if (memberId) fetchMember(); }, [memberId]);

    const handleDelete = async () => {
        if (!member) return;
        if (!confirm(`Soft-delete ${member.name}? You can restore them later.`)) return;
        const res = await fetch(`/api/members/${memberId}`, { method: "DELETE" });
        if (res.ok) fetchMember();
        else alert((await res.json()).error);
    };

    const handleRestore = async () => {
        const res = await fetch(`/api/members/${memberId}/restore`, { method: "POST" });
        if (res.ok) fetchMember();
        else alert((await res.json()).error);
    };

    const handleIssueEquipment = async () => {
        if (!newItem.trim()) return;
        setIssuing(true);
        const res = await fetch(`/api/members/${memberId}/equipment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemName: newItem.trim() }),
        });
        if (res.ok) { setNewItem(""); fetchMember(); }
        else alert((await res.json()).error);
        setIssuing(false);
    };

    const handleReturnEquipment = async (equipmentItemId: string) => {
        const res = await fetch(`/api/members/${memberId}/equipment`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ equipmentItemId }),
        });
        if (res.ok) fetchMember();
        else alert((await res.json()).error);
    };

    const handleReprint = () => {
        if (!member) return;
        const plan = member.planId as Plan;
        printThermal({
            poolName:     "Swimming Pool",
            memberId:     member.memberId,
            name:         member.name,
            age:          member.age,
            phone:        member.phone,
            planName:     plan?.name ?? "N/A",
            planQty:      member.planQuantity ?? 1,
            planPrice:    plan?.price ?? 0,
            paidAmount:   member.paidAmount ?? 0,
            balance:      member.balanceAmount ?? 0,
            registeredAt: new Date(member.createdAt),
            validTill:    new Date(member.planEndDate || member.expiryDate || ""),
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
        );
    }

    if (!member) {
        return <div className="text-center py-20 text-gray-500">Member not found.</div>;
    }

    const unreturned = (member.equipmentTaken ?? []).filter(e => !e.isReturned);
    const returned   = (member.equipmentTaken ?? []).filter(e => e.isReturned);

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Back */}
            <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Members
            </button>

            {/* Expiry Banner */}
            <ExpiryBanner member={member} />

            {/* Member Info Card */}
            <div className="rounded-2xl border border-[#1f2937] bg-slate-900 shadow-2xl overflow-hidden">
                <div className="flex items-start gap-6 p-6">
                    {member.photoUrl
                        ? <img src={`/api/members/${member._id}/photo`} alt="" className="h-20 w-20 rounded-xl object-cover ring-1 ring-[#1f2937] shrink-0" />
                        : <div className="h-20 w-20 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                            <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{member.name.charAt(0).toUpperCase()}</span>
                          </div>
                    }
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <h2 className="text-xl font-semibold text-[#f9fafb]">{member.name}</h2>
                                <p className="text-sm text-gray-500 mt-0.5">{member.memberId}{member.age ? ` · ${member.age} yrs` : ""}</p>
                            </div>
                            {/* Action buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <a href={`/api/members/${memberId}/pdf`} download
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 shadow-md hover:bg-white/10 transition">
                                    <Download className="h-3.5 w-3.5" /> ID Card
                                </a>
                                {member.planId?.hasTokenPrint && (
                                    <button onClick={handleReprint}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400 shadow-md hover:bg-emerald-500/20 transition">
                                        <Printer className="h-3.5 w-3.5" /> Reprint Token
                                    </button>
                                )}
                                <PrinterAppsHelp />
                                {member.isDeleted ? (
                                    <button onClick={handleRestore}
                                        className="inline-flex items-center gap-1.5 rounded-md bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 px-3 py-1.5 text-sm font-medium text-white ">
                                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                                    </button>
                                ) : (
                                    <button onClick={handleDelete}
                                        className="inline-flex items-center gap-1.5 rounded-md bg-[#0b1220] px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 ring-1 ring-red-300 dark:ring-red-800 hover:bg-red-50 hover:bg-red-500/10 shadow-sm transition">
                                        <Trash2 className="h-3.5 w-3.5" /> Delete
                                    </button>
                                )}
                            </div>
                        </div>

                        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                            <div><dt className="text-gray-400">Phone</dt><dd className="font-medium dark:text-white">{member.phone}</dd></div>
                            <div><dt className="text-gray-400">Plan</dt><dd className="font-medium dark:text-white">{member.planId?.name ?? "N/A"}</dd></div>
                            <div><dt className="text-gray-400">Quantity</dt><dd className="font-medium dark:text-white">{member.planQuantity ?? 1}</dd></div>
                            <div>
                                <dt className="text-gray-400">Paid</dt>
                                <dd className="font-medium text-green-600 dark:text-green-400">₹{(member.paidAmount ?? 0).toLocaleString("en-IN")}</dd>
                            </div>
                            <div>
                                <dt className="text-gray-400">Balance</dt>
                                <dd className={`font-medium ${(member.balanceAmount ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-gray-500"}`}>
                                    {(member.balanceAmount ?? 0) > 0 ? `₹${member.balanceAmount.toLocaleString("en-IN")}` : "Nil"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-gray-400">Payment</dt>
                                <dd className="font-medium capitalize dark:text-white">{member.paymentStatus}</dd>
                            </div>
                            {member.address && <div className="col-span-2"><dt className="text-gray-400">Address</dt><dd className="font-medium dark:text-white">{member.address}</dd></div>}
                            {member.aadharCard && <div><dt className="text-gray-400">Aadhar</dt><dd className="font-medium dark:text-white">••••{member.aadharCard.slice(-4)}</dd></div>}
                        </dl>
                    </div>
                </div>
            </div>

            {/* Equipment Panel */}
            <div className="rounded-2xl border border-[#1f2937] bg-slate-900 shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5 dark:backdrop-blur-md">
                    <h3 className="text-base font-semibold text-[#f9fafb] flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-500" /> Equipment
                        {unreturned.length > 0 && (
                            <span className="ml-1 inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">
                                {unreturned.length} out
                            </span>
                        )}
                    </h3>
                </div>

                {/* Issue form */}
                <div className="px-6 py-4 border-b border-[#1f2937] bg-gray-50 bg-[#0b1220]/50">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Item name (e.g. Locker Key, Kickboard)"
                            value={newItem}
                            onChange={e => setNewItem(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleIssueEquipment()}
                            className="flex-1 rounded-md border border-gray-300 border-[#1f2937] bg-[#0b1220] shadow-sm px-3 py-2 text-sm text-[#f9fafb] placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                            onClick={handleIssueEquipment}
                            disabled={issuing || !newItem.trim()}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 px-4 py-2 text-sm font-medium text-white  disabled:opacity-50"
                        >
                            <Package className="h-3.5 w-3.5" /> Issue
                        </button>
                    </div>
                </div>

                {/* Outstanding */}
                {unreturned.length > 0 && (
                    <div className="px-6 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Currently Out</p>
                        <div className="space-y-2">
                            {unreturned.map(item => (
                                <div key={item._id} className="flex items-center justify-between rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 px-3 py-2">
                                    <div>
                                        <p className="text-sm font-medium text-[#f9fafb]">{item.itemName}</p>
                                        <p className="text-xs text-gray-500">Issued {new Date(item.issuedDate).toLocaleDateString("en-IN")}</p>
                                    </div>
                                    <button
                                        onClick={() => handleReturnEquipment(item._id)}
                                        className="inline-flex items-center gap-1 rounded-md bg-[#0b1220] px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-green-300 dark:ring-green-800 hover:bg-green-50 hover:bg-green-500/10 shadow-sm transition"
                                    >
                                        <PackageCheck className="h-3 w-3" /> Return
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Returned history */}
                {returned.length > 0 && (
                    <div className="px-6 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Returned</p>
                        <div className="space-y-1.5">
                            {returned.map(item => (
                                <div key={item._id} className="flex items-center justify-between rounded-lg bg-[#0b1220] border border-gray-100 dark:border-white/5 px-3 py-2 opacity-60">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 line-through">{item.itemName}</p>
                                    <p className="text-xs text-gray-400">Returned {item.returnedDate ? new Date(item.returnedDate).toLocaleDateString("en-IN") : "—"}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(member.equipmentTaken ?? []).length === 0 && (
                    <div className="px-6 py-6 text-center text-sm text-gray-400">No equipment issued yet.</div>
                )}
            </div>
        </div>
    );
}
