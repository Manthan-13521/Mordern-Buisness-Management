"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, Trophy, Calendar, Users, CheckCircle } from "lucide-react";

interface Competition {
    _id: string;
    name: string;
    date: string;
    category: string;
    participants: { _id: string; name: string; laneNumber?: number; timing?: number; position?: number }[];
    winners: { position: number; name: string; timing?: number; prize?: string }[];
    notes?: string;
    isCompleted: boolean;
    createdAt: string;
}

function CreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [form, setForm] = useState({ name: "", date: "", category: "", notes: "" });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const res = await fetch("/api/competitions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        setSaving(false);
        if (res.ok) { onSuccess(); onClose(); }
        else alert((await res.json()).error || "Failed to create competition");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-[#0b1220] shadow-2xl p-6 border border-[#1f2937]">
                <h2 className="text-lg font-semibold text-[#f9fafb] mb-4">Create Competition</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#9ca3af] mb-1">Name</label>
                        <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. 100m Freestyle Sprint"
                            className="block w-full rounded-lg border border-[#1f2937] bg-[#0b1220] shadow-sm px-3 py-2 text-sm text-[#f9fafb] focus:ring-2 focus:ring-[#8b5cf6]" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#9ca3af] mb-1">Date</label>
                        <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                            className="block w-full rounded-lg border border-[#1f2937] bg-[#0b1220] shadow-sm px-3 py-2 text-sm text-[#f9fafb] focus:ring-2 focus:ring-[#8b5cf6]" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#9ca3af] mb-1">Category</label>
                        <input required type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                            placeholder="e.g. Junior, Senior, Open"
                            className="block w-full rounded-lg border border-[#1f2937] bg-[#0b1220] shadow-sm px-3 py-2 text-sm text-[#f9fafb] focus:ring-2 focus:ring-[#8b5cf6]" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#9ca3af] mb-1">Notes <span className="text-[#6b7280]">(optional)</span></label>
                        <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                            className="block w-full rounded-lg border border-[#1f2937] bg-[#0b1220] shadow-sm px-3 py-2 text-sm text-[#f9fafb] focus:ring-2 focus:ring-[#8b5cf6]" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-[#9ca3af] ring-1 ring-gray-300 hover:bg-[#8b5cf6]/5">Cancel</button>
                        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 px-4 py-2 text-sm font-medium text-white  disabled:opacity-60">
                            {saving && <RefreshCw className="h-4 w-4 animate-spin" />} Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CompetitionDetail({ comp, onRefresh }: { comp: Competition; onRefresh: () => void }) {
    const [newParticipant, setNewParticipant] = useState("");
    const [adding, setAdding] = useState(false);

    // Winner form state
    const [winners, setWinners] = useState<{ name: string; timing: string; prize: string }[]>([
        { name: "", timing: "", prize: "" },
        { name: "", timing: "", prize: "" },
        { name: "", timing: "", prize: "" },
    ]);
    const [savingWinners, setSavingWinners] = useState(false);

    const addParticipant = async () => {
        if (!newParticipant.trim()) return;
        setAdding(true);
        const res = await fetch(`/api/competitions/${comp._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participant: { name: newParticipant.trim() } }),
        });
        setAdding(false);
        if (res.ok) { setNewParticipant(""); onRefresh(); }
    };

    const markComplete = async () => {
        await fetch(`/api/competitions/${comp._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isCompleted: true }),
        });
        onRefresh();
    };

    const saveWinners = async () => {
        setSavingWinners(true);
        for (let i = 0; i < 3; i++) {
            const w = winners[i];
            if (!w.name.trim()) continue;
            await fetch(`/api/competitions/${comp._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    winner: {
                        position: i + 1,
                        name: w.name.trim(),
                        timing: w.timing ? parseFloat(w.timing) : undefined,
                        prize: w.prize.trim() || undefined,
                    },
                }),
            });
        }
        setSavingWinners(false);
        setWinners([
            { name: "", timing: "", prize: "" },
            { name: "", timing: "", prize: "" },
            { name: "", timing: "", prize: "" },
        ]);
        onRefresh();
    };

    const medalLabels = ["🥇 1st Place", "🥈 2nd Place", "🥉 3rd Place"];
    const medalColors = ["text-yellow-500", "text-[#6b7280]", "text-orange-500"];

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-base font-semibold text-[#f9fafb]">{comp.name}</h3>
                    <p className="text-sm text-[#6b7280]">{comp.category} · {new Date(comp.date).toLocaleDateString("en-IN")}</p>
                </div>
                {!comp.isCompleted && (
                    <button onClick={markComplete}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500/100">
                        <CheckCircle className="h-3.5 w-3.5" /> Mark Complete
                    </button>
                )}
                {comp.isCompleted && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs font-semibold text-green-400">
                        ✓ Completed
                    </span>
                )}
            </div>

            {/* Winners Podium */}
            {comp.winners.length > 0 && (
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280] mb-2">🏆 Winners</p>
                    <div className="space-y-1.5">
                        {comp.winners.sort((a, b) => a.position - b.position).map(w => (
                            <div key={w.position} className="flex items-center gap-2 rounded-lg bg-[#020617] bg-[#0b1220] border border-[#1f2937]/50 px-3 py-2">
                                <span className={`text-lg ${medalColors[w.position - 1] ?? "text-[#6b7280]"}`}>
                                    {w.position === 1 ? "🥇" : w.position === 2 ? "🥈" : w.position === 3 ? "🥉" : `#${w.position}`}
                                </span>
                                <p className="flex-1 text-sm font-medium text-[#f9fafb]">{w.name}</p>
                                {w.timing && <p className="text-xs text-[#6b7280]">{w.timing}s</p>}
                                {w.prize && <p className="text-xs text-blue-600 font-medium">{w.prize}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Record Winners Form — shown only for non-completed competitions */}
            {!comp.isCompleted && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-900/10 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 flex items-center gap-1.5">
                        <Trophy className="h-3.5 w-3.5" /> Record Winners
                    </p>
                    {winners.map((w, i) => (
                        <div key={i} className="space-y-1.5">
                            <p className="text-xs font-bold text-[#9ca3af]">{medalLabels[i]}</p>
                            <div className="grid grid-cols-3 gap-2">
                                <input type="text" placeholder="Winner name" value={w.name}
                                    onChange={e => { const arr = [...winners]; arr[i] = { ...arr[i], name: e.target.value }; setWinners(arr); }}
                                    className="col-span-1 rounded-lg border border-[#1f2937] bg-[#0b1220] bg-[#0b1220] border border-[#1f2937] px-2.5 py-1.5 text-sm text-[#f9fafb] focus:ring-2 focus:ring-[#8b5cf6]" />
                                <input type="number" step="0.01" placeholder="Time (s)" value={w.timing}
                                    onChange={e => { const arr = [...winners]; arr[i] = { ...arr[i], timing: e.target.value }; setWinners(arr); }}
                                    className="rounded-lg border border-[#1f2937] bg-[#0b1220] bg-[#0b1220] border border-[#1f2937] px-2.5 py-1.5 text-sm text-[#f9fafb] focus:ring-2 focus:ring-[#8b5cf6]" />
                                <input type="text" placeholder="Prize (opt)" value={w.prize}
                                    onChange={e => { const arr = [...winners]; arr[i] = { ...arr[i], prize: e.target.value }; setWinners(arr); }}
                                    className="rounded-lg border border-[#1f2937] bg-[#0b1220] bg-[#0b1220] border border-[#1f2937] px-2.5 py-1.5 text-sm text-[#f9fafb] focus:ring-2 focus:ring-[#8b5cf6]" />
                            </div>
                        </div>
                    ))}
                    <button onClick={saveWinners} disabled={savingWinners || winners.every(w => !w.name.trim())}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50">
                        {savingWinners && <RefreshCw className="h-4 w-4 animate-spin" />}
                        Save Winners
                    </button>
                </div>
            )}

            {/* Participants */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280] mb-2">Participants ({comp.participants.length})</p>
                {comp.participants.length === 0 ? (
                    <p className="text-sm text-[#6b7280]">No participants yet.</p>
                ) : (
                    <div className="space-y-1.5">
                        {comp.participants.map(p => (
                            <div key={p._id} className="flex items-center gap-2 rounded-lg bg-[#020617] bg-[#0b1220] border border-[#1f2937]/50 px-3 py-2">
                                {p.laneNumber && <span className="text-xs text-[#6b7280] w-6">L{p.laneNumber}</span>}
                                <p className="flex-1 text-sm text-[#f9fafb]">{p.name}</p>
                                {p.timing && <span className="text-xs text-[#6b7280]">{p.timing}s</span>}
                                {p.position && <span className="text-xs font-bold text-blue-600">#{p.position}</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Participant */}
            {!comp.isCompleted && (
                <div className="flex gap-2 pt-2">
                    <input type="text" placeholder="Add participant name…" value={newParticipant} onChange={e => setNewParticipant(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addParticipant()}
                        className="flex-1 rounded-lg border border-[#1f2937] bg-[#0b1220] bg-[#0b1220] border border-[#1f2937] px-3 py-2 text-sm text-[#f9fafb] focus:ring-2 focus:ring-[#8b5cf6]" />
                    <button onClick={addParticipant} disabled={adding || !newParticipant.trim()}
                        className="rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 px-4 py-2 text-sm font-medium text-white  disabled:opacity-50">
                        {adding ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function CompetitionsPage() {
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [total, setTotal]               = useState(0);
    const [page, setPage]                 = useState(1);
    const [filter, setFilter]             = useState<"all" | "upcoming" | "completed">("all");
    const [loading, setLoading]           = useState(true);
    const [showModal, setShowModal]       = useState(false);
    const [selected, setSelected]         = useState<Competition | null>(null);
    const LIMIT = 10;

    const fetchComps = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), ...(filter !== "all" ? { status: filter } : {}) });
        fetch(`/api/competitions?${params}`)
            .then(r => r.json())
            .then(d => {
                setCompetitions(d.data ?? []);
                setTotal(d.total ?? 0);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [page, filter]);

    useEffect(() => { fetchComps(); }, [fetchComps]);
    useEffect(() => { setPage(1); }, [filter]);

    const refreshSelected = () => {
        fetchComps();
        if (selected) {
            fetch(`/api/competitions/${selected._id}`)
                .then(r => r.json())
                .then(d => setSelected(d));
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-[#f9fafb]">Competitions</h1>
                    <p className="mt-1 text-sm text-[#9ca3af]">{total} event{total !== 1 ? "s" : ""}</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="mt-4 sm:mt-0 inline-flex items-center gap-1.5 rounded-md bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 px-3 py-2 text-sm font-semibold text-white ">
                    <Plus className="h-4 w-4" /> New Competition
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 p-1 bg-[#0b1220] bg-[#0b1220] border border-[#1f2937] rounded-lg w-fit">
                {(["all", "upcoming", "completed"] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors capitalize ${filter === f ? "bg-[#0b1220] text-[#f9fafb] shadow-sm" : "text-[#9ca3af] hover:text-[#9ca3af] dark:hover:text-[#9ca3af]"}`}>
                        {f}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Competition List */}
                <div className="lg:col-span-2 space-y-3">
                    {loading ? (
                        <div className="text-center py-10"><RefreshCw className="animate-spin h-5 w-5 mx-auto text-blue-500" /></div>
                    ) : competitions.length === 0 ? (
                        <div className="rounded-xl border border-[#1f2937] bg-[#0b1220] py-16 text-center">
                            <Trophy className="h-10 w-10 mx-auto text-[#9ca3af] mb-3" />
                            <p className="text-[#6b7280] text-sm">No competitions yet.</p>
                        </div>
                    ) : competitions.map(c => (
                        <div key={c._id} onClick={() => setSelected(c)}
                            className={`rounded-xl border bg-[#0b1220] p-4 cursor-pointer hover:shadow-md transition-all ${selected?._id === c._id ? "border-indigo-500 ring-1 ring-indigo-500" : "border-[#1f2937]"}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-[#f9fafb] text-sm truncate">{c.name}</p>
                                    <p className="text-xs text-[#6b7280] mt-0.5">{c.category}</p>
                                </div>
                                {c.isCompleted
                                    ? <span className="ml-2 inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-400">✓ Done</span>
                                    : <span className="ml-2 inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400">Upcoming</span>
                                }
                            </div>
                            <div className="mt-2 flex items-center gap-3 text-xs text-[#6b7280]">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(c.date).toLocaleDateString("en-IN")}</span>
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.participants.length} participants</span>
                            </div>
                        </div>
                    ))}
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center pt-2">
                            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                                className="text-sm text-blue-600 hover:underline disabled:opacity-40">← Prev</button>
                            <span className="text-xs text-[#6b7280]">Page {page}/{totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages}
                                className="text-sm text-blue-600 hover:underline disabled:opacity-40">Next →</button>
                        </div>
                    )}
                </div>

                {/* Detail Panel */}
                <div className="lg:col-span-3 rounded-xl border border-[#1f2937] bg-[#0b1220] shadow-sm p-5">
                    {selected ? (
                        <CompetitionDetail comp={selected} onRefresh={refreshSelected} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                            <Trophy className="h-12 w-12 text-[#9ca3af] dark:text-[#9ca3af] mb-3" />
                            <p className="text-[#6b7280] text-sm">Select a competition to manage participants and record results</p>
                        </div>
                    )}
                </div>
            </div>

            {showModal && <CreateModal onClose={() => setShowModal(false)} onSuccess={fetchComps} />}
        </div>
    );
}
