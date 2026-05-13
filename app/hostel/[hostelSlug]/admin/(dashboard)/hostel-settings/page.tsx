"use client";

import { useEffect, useState } from "react";
import { Save, ArrowLeft, Plus, Trash2, Home, MapPin, BedDouble, Layers, CheckCircle2, Building2, Grid, ChevronRight } from "lucide-react";

type Room = { _id?: string; roomNo: string; capacity: number; occupiedBeds?: number; };
type Floor = { _id?: string; floorNo: string; occupiedBeds?: number; rooms: Room[]; };
type Block = { _id?: string; name: string; occupiedBeds?: number; floors: Floor[]; };

export default function HostelSettingsPage() {
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [maxBlocks, setMaxBlocks] = useState(4);
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);
    const [whatsappTemplate, setWhatsappTemplate] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    const [viewLevel, setViewLevel] = useState<"blocks"|"floors"|"rooms"|"beds">("blocks");
    const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
    const [activeFloorIndex, setActiveFloorIndex] = useState<number | null>(null);
    const [activeRoomIndex, setActiveRoomIndex] = useState<number | null>(null);

    const loadSettings = () => {
        fetch("/api/hostel/hostel-settings", { cache: 'no-store' }).then(r => r.json()).then(d => {
            setBlocks(d.blocks || []);
            setMaxBlocks(d.maxBlocks ?? 4);
            setWhatsappEnabled(d.whatsappEnabled || false);
            setWhatsappTemplate(d.whatsappMessageTemplate || "Dear {name}, your stay at {hostelName} expires on {expiry}. Please renew promptly.");
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true); setError(""); setSuccess("");
        const res = await fetch("/api/hostel/hostel-settings", { 
            method: "PUT", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ blocks, whatsappEnabled, whatsappMessageTemplate: whatsappTemplate }) 
        });
        const data = await res.json();
        setSaving(false);
        if (!res.ok) { 
            setError(typeof data.error === "string" ? data.error : (data.error?.message || JSON.stringify(data.error) || "Failed to save structure")); 
            return; 
        }
        setSuccess("Structure saved successfully!"); 
        // Reload to sync fresh ObjectIDs from database and exact occupancies
        loadSettings(); 
        setTimeout(() => setSuccess(""), 4000);
    };

    // BLOCK Actions
    const addBlock = () => {
        if (blocks.length >= maxBlocks) { alert(`Max ${maxBlocks} blocks allowed.`); return; }
        setBlocks(b => [...b, { name: `${String.fromCharCode(65 + b.length)}`, floors: [], occupiedBeds: 0 }]);
    };
    const deleteBlock = () => {
        if (blocks.length === 0) return;
        const lastBlock = blocks[blocks.length - 1];
        if (lastBlock.occupiedBeds && lastBlock.occupiedBeds > 0) {
            alert("Cannot delete: Block contains active members");
            return;
        }
        if (!confirm("Are you sure you want to delete the last block?")) return;
        setBlocks(b => b.slice(0, -1));
    };

    // FLOOR Actions
    const addFloor = () => {
        if (activeBlockIndex === null) return;
        setBlocks(b => b.map((block, i) => {
            if (i === activeBlockIndex) {
                if (block.floors.length >= 8) { alert("Max 8 floors."); return block; }
                return { ...block, floors: [...block.floors, { floorNo: String(block.floors.length + 1), rooms: [], occupiedBeds: 0 }] };
            }
            return block;
        }));
    };
    const deleteFloor = () => {
        if (activeBlockIndex === null) return;
        const activeBlock = blocks[activeBlockIndex];
        const lastFloor = activeBlock.floors[activeBlock.floors.length - 1];
        if (!lastFloor) return;

        if (lastFloor.occupiedBeds && lastFloor.occupiedBeds > 0) {
            alert("Cannot delete: Floor contains occupied rooms");
            return;
        }

        if (!confirm("Delete the top floor?")) return;
        setBlocks(b => b.map((block, i) => {
            if (i === activeBlockIndex) {
                return { ...block, floors: block.floors.slice(0, -1) };
            }
            return block;
        }));
    };

    // ROOM Actions
    const addRoom = () => {
        if (activeBlockIndex === null || activeFloorIndex === null) return;
        setBlocks(b => b.map((block, i) => i === activeBlockIndex ? { ...block, floors: block.floors.map((floor, j) => {
            if (j === activeFloorIndex) {
                if (floor.rooms.length >= 15) { alert("Max 15 rooms."); return floor; }
                const nextNum = floor.rooms.length + 1;
                const paddedNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
                return { ...floor, rooms: [...floor.rooms, { roomNo: `${floor.floorNo}${paddedNum}`, capacity: 1, occupiedBeds: 0 }] };
            }
            return floor;
        }) } : block));
    };
    const deleteRoom = () => {
        if (activeBlockIndex === null || activeFloorIndex === null) return;
        const activeFloor = blocks[activeBlockIndex].floors[activeFloorIndex];
        const lastRoom = activeFloor.rooms[activeFloor.rooms.length - 1];
        if (!lastRoom) return;

        if (lastRoom.occupiedBeds && lastRoom.occupiedBeds > 0) {
            alert("Cannot delete: Room has active members");
            return;
        }

        if (!confirm("Delete the last room?")) return;
        setBlocks(b => b.map((block, i) => i === activeBlockIndex ? { ...block, floors: block.floors.map((floor, j) => {
            if (j === activeFloorIndex) {
                return { ...floor, rooms: floor.rooms.slice(0, -1) };
            }
            return floor;
        }) } : block));
    };

    // BED Actions (Capacity)
    const addBed = () => {
        if (activeBlockIndex === null || activeFloorIndex === null || activeRoomIndex === null) return;
        setBlocks(b => b.map((block, i) => i === activeBlockIndex ? { ...block, floors: block.floors.map((floor, j) => j === activeFloorIndex ? { ...floor, rooms: floor.rooms.map((room, k) => {
            if (k === activeRoomIndex) {
                if (room.capacity >= 6) { alert("Max 6 beds per room constraints."); return room; }
                return { ...room, capacity: room.capacity + 1 };
            }
            return room;
        }) } : floor) } : block));
    };
    const deleteBed = () => {
        if (activeBlockIndex === null || activeFloorIndex === null || activeRoomIndex === null) return;
        const activeRoom = blocks[activeBlockIndex].floors[activeFloorIndex].rooms[activeRoomIndex];
        
        if (activeRoom.capacity <= 1) { alert("Must have at least 1 bed."); return; }
        if (activeRoom.occupiedBeds && activeRoom.occupiedBeds >= activeRoom.capacity) {
            alert("Cannot reduce capacity below currently occupied bed count.");
            return;
        }

        setBlocks(b => b.map((block, i) => i === activeBlockIndex ? { ...block, floors: block.floors.map((floor, j) => j === activeFloorIndex ? { ...floor, rooms: floor.rooms.map((room, k) => {
            if (k === activeRoomIndex) {
                return { ...room, capacity: room.capacity - 1 };
            }
            return room;
        }) } : floor) } : block));
    };
    
    // Updates
    const updateBlockName = (bi: number, name: string) => setBlocks(b => b.map((block, i) => i === bi ? { ...block, name } : block));
    const updateRoomNo = (bi: number, fi: number, ri: number, roomNo: string) => setBlocks(b => b.map((block, i) => i === bi ? { ...block, floors: block.floors.map((floor, j) => j === fi ? { ...floor, rooms: floor.rooms.map((room, k) => k === ri ? { ...room, roomNo } : room) } : floor) } : block));

    const goBack = () => {
        if (viewLevel === "beds") setViewLevel("rooms");
        else if (viewLevel === "rooms") setViewLevel("floors");
        else if (viewLevel === "floors") setViewLevel("blocks");
    };

    if (loading) return (
        <div className="flex h-64 items-center justify-center font-bold text-slate-500 animate-pulse">
            Loading Structure Editor...
        </div>
    );

    const activeBlock = activeBlockIndex !== null ? blocks[activeBlockIndex] : null;
    const activeFloor = activeBlock && activeFloorIndex !== null ? activeBlock.floors[activeFloorIndex] : null;
    const activeRoom = activeFloor && activeRoomIndex !== null ? activeFloor.rooms[activeRoomIndex] : null;

    const Breadcrumb = () => (
        <div className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-6 bg-slate-900 p-3 rounded-xl border border-[#1f2937] shadow-lg w-full">
            <button onClick={() => setViewLevel("blocks")} className={`hover:text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1.5 ${viewLevel === "blocks" ? "text-blue-600 dark:text-blue-400" : ""}`}>
                <Building2 className="w-4 h-4" /> Structure
            </button>
            {activeBlock && viewLevel !== "blocks" && (
                <>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                    <button onClick={() => setViewLevel("floors")} className={`hover:text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1 text-sm ${viewLevel === "floors" ? "text-blue-600 dark:text-blue-400" : ""}`}>
                        <Layers className="w-3.5 h-3.5"/> Block {activeBlock.name}
                    </button>
                </>
            )}
            {activeFloor && (viewLevel === "rooms" || viewLevel === "beds") && (
                <>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                    <button onClick={() => setViewLevel("rooms")} className={`hover:text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1 text-sm ${viewLevel === "rooms" ? "text-blue-600 dark:text-blue-400" : ""}`}>
                        <Grid className="w-3.5 h-3.5"/> Floor {activeFloor.floorNo}
                    </button>
                </>
            )}
            {activeRoom && viewLevel === "beds" && (
                <>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                    <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 text-sm"><BedDouble className="w-3.5 h-3.5"/> Room {activeRoom.roomNo}</span>
                </>
            )}
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-black text-[#f9fafb] tracking-tight uppercase flex items-center gap-2">
                    <span className="bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 p-2 rounded-lg text-white"><Layers className="w-6 h-6"/></span>
                    Hostel Settings
                </h1>
                
                <button onClick={handleSave} disabled={saving} className="bg-[#8b5cf6] hover:bg-[#7c3aed] border-0  text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save Structure"}
                </button>
            </div>

            {success && <div className="p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold flex items-center gap-2 shadow-sm"><CheckCircle2 className="w-5 h-5"/> {success}</div>}
            {error && <div className="p-4 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl font-bold shadow-sm">{error}</div>}

            <Breadcrumb />

            <div className="bg-slate-950/20 backdrop-blur-md border border-[#1f2937] rounded-2xl min-h-[500px] flex flex-col p-6 shadow-inner relative">

                {viewLevel !== "blocks" && (
                    <button onClick={goBack} className="absolute top-6 left-6 z-10 flex items-center gap-1.5 bg-slate-800 border border-white/10 hover:border-blue-500 text-slate-300 font-bold px-4 py-2 rounded-lg transition-all shadow-sm">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                )}

                {/* Level 1: BLOCKS */}
                {viewLevel === "blocks" && (
                    <div className="flex-1 flex flex-col items-center justify-start pt-4">
                        <div className="w-full flex justify-end gap-3 mb-10 border-b border-white/5 pb-4">
                            <button onClick={addBlock} className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-blue-400 hover:bg-white/10 px-4 py-2 rounded-lg font-bold text-sm shadow-sm"><Plus className="w-4 h-4"/> Add Block</button>
                            <button onClick={deleteBlock} className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-rose-400 hover:bg-white/10 px-4 py-2 rounded-lg font-bold text-sm shadow-sm"><Trash2 className="w-4 h-4"/> Remove End</button>
                        </div>

                        <div className="flex flex-wrap justify-center items-end gap-16 sm:gap-24 w-full">
                            {blocks.map((b, i) => (
                                <div key={i} className="flex flex-col items-center group relative">
                                    <div className="flex items-center gap-2 mb-4 bg-slate-800 p-2 rounded-xl shadow-lg border border-white/10 z-10">
                                        <span className="font-bold text-slate-400 uppercase text-xs">Block</span>
                                        <input 
                                            value={b.name}
                                            onChange={e => updateBlockName(i, e.target.value)}
                                            className="font-black text-xl text-center w-12 bg-slate-950 border-0 outline-none focus:ring-2 focus:ring-blue-500 rounded p-1 text-white"
                                        />
                                    </div>

                                    {/* Building Shape Editor */}
                                    <div 
                                        onClick={() => { setActiveBlockIndex(i); setViewLevel("floors"); }}
                                        className="relative flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-2"
                                    >
                                        {/* Nice stepped roof */}
                                        <div className="w-24 h-4 bg-slate-400 dark:bg-slate-600 rounded-t-sm group-hover:bg-indigo-400 transition-colors"></div>
                                        <div className="w-32 h-6 bg-slate-300 dark:bg-slate-500 rounded-t-sm group- transition-colors shadow-sm z-10"></div>
                                        
                                        {/* Building Body */}
                                        <div className="w-40 min-h-[240px] bg-slate-100 dark:bg-slate-800 border-x border-t border-slate-300 dark:border-slate-700 flex flex-col-reverse p-3 shadow-2xl group-hover:border-indigo-400 group-hover:shadow-indigo-500/20 transition-all rounded-b-md border-b-[8px] border-b-slate-400 dark:border-b-slate-900">
                                            
                                            {/* Entrance Door */}
                                            <div className="w-full flex justify-center pt-2 relative z-10">
                                                <div className="w-16 h-12 bg-slate-800 dark:bg-slate-950 rounded-t-lg flex border-4 border-slate-400 dark:border-slate-600 overflow-hidden shadow-inner relative group-hover:border-indigo-400/50">
                                                    {/* Double doors */}
                                                    <div className="flex-1 border-r border-slate-600 dark:border-slate-800 relative">
                                                        <div className="absolute right-1 top-1/2 w-1 h-3 bg-slate-400 rounded-full"></div>
                                                    </div>
                                                    <div className="flex-1 relative">
                                                        <div className="absolute left-1 top-1/2 w-1 h-3 bg-slate-400 rounded-full"></div>
                                                    </div>
                                                    {/* Awning light */}
                                                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-400 rounded-full blur-[4px] opacity-60 group-hover:opacity-100 transition-opacity"></div>
                                                </div>
                                            </div>

                                            {/* Floors/Windows */}
                                            <div className="flex flex-col-reverse gap-3 w-full mt-2">
                                                {b.floors.map((_, idx) => (
                                                    <div key={idx} className="w-full flex justify-around px-1">
                                                        {/* 3 Windows per floor */}
                                                        <div className="w-6 h-8 bg-sky-200 dark:bg-sky-900/60 border-b-4 border-slate-300 dark:border-slate-700 rounded-t-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800/40 transition-colors relative"><div className="absolute top-0 right-1 w-1 h-4 bg-white/40 rotate-[20deg] rounded-full"></div></div>
                                                        <div className="w-6 h-8 bg-sky-200 dark:bg-sky-900/60 border-b-4 border-slate-300 dark:border-slate-700 rounded-t-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800/40 transition-colors relative"><div className="absolute top-0 right-1 w-1 h-4 bg-white/40 rotate-[20deg] rounded-full"></div></div>
                                                        <div className="w-6 h-8 bg-sky-200 dark:bg-sky-900/60 border-b-4 border-slate-300 dark:border-slate-700 rounded-t-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800/40 transition-colors relative"><div className="absolute top-0 right-1 w-1 h-4 bg-white/40 rotate-[20deg] rounded-full"></div></div>
                                                    </div>
                                                ))}
                                                <div className="text-center font-bold text-[10px] text-slate-400 mt-2 uppercase tracking-widest mt-auto group-hover:text-indigo-400">Edit Floors</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-xs font-bold text-slate-500 text-center uppercase tracking-wider space-y-1">
                                        <p>{b.floors.length} Floors</p>
                                        <p className={`${b.occupiedBeds && b.occupiedBeds > 0 ? "text-emerald-500" : "text-slate-400"}`}>
                                            {b.occupiedBeds || 0} Occupied Beds
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {blocks.length === 0 && (
                                <div className="text-slate-400 font-bold uppercase tracking-widest text-center mt-20">
                                    No blocks created yet. Click "+ Add Block".
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Level 2: FLOORS */}
                {viewLevel === "floors" && activeBlock && (
                    <div className="flex-1 flex flex-col items-center justify-start pt-4">
                        <div className="w-full flex justify-between items-center gap-3 mb-10 border-b-2 border-[#1f2937] pb-4 ml-0 sm:ml-20">
                            <h3 className="font-bold text-slate-500 uppercase tracking-widest">Building Stack</h3>
                            <div className="flex gap-3">
                                <button onClick={addFloor} className="flex items-center gap-1.5 bg-[#0b1220] border-2 border-indigo-200 text-blue-600 dark:text-blue-400 hover:bg-[#8b5cf6]/10 px-4 py-2 rounded-lg font-bold text-sm shadow-sm"><Plus className="w-4 h-4"/> Add Top Floor</button>
                                <button onClick={deleteFloor} className="flex items-center gap-1.5 bg-[#0b1220] border-2 border-slate-200 text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-lg font-bold text-sm shadow-sm"><Trash2 className="w-4 h-4"/> Remove Top</button>
                            </div>
                        </div>

                        {/* Stacked floor visual editor */}
                        <div className="flex flex-col-reverse justify-end items-center gap-1.5 bg-slate-200/50 dark:bg-slate-800 p-8 rounded-t-xl border-x-[6px] border-t-[6px] border-slate-300 dark:border-slate-600 min-w-[340px] shadow-inner relative">
                            {activeBlock.floors.length === 0 && <span className="font-bold text-slate-400 uppercase py-10">No floors added</span>}
                            
                            {activeBlock.floors.map((f, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => { setActiveFloorIndex(i); setViewLevel("rooms"); }}
                                    className="w-[300px] sm:w-[400px] h-16 sm:h-20 bg-[#0b1220] border-4 border-slate-400 dark:border-slate-500 rounded-sm flex justify-between items-center px-6 cursor-pointer hover:bg-[#8b5cf6]/10 dark:hover:bg-slate-700 hover:border-indigo-500 group transition-all"
                                >
                                    <span className="text-2xl font-black text-[#f9fafb] group-hover:text-blue-600 dark:text-blue-400 transition-colors">Floor {f.floorNo}</span>
                                    <div className="flex gap-2">
                                        <span className={`font-bold text-xs px-2 py-1.5 rounded-lg border-2 ${f.occupiedBeds && f.occupiedBeds > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                                            {f.occupiedBeds || 0} Occupied
                                        </span>
                                        <span className="font-bold text-slate-400 uppercase text-xs group-hover:text-blue-500 bg-[#020617] border-2 border-[#1f2937] px-3 py-1.5 rounded-lg">{f.rooms.length} Rooms &gt;</span>
                                    </div>
                                </div>
                            ))}
                            <div className="w-[320px] sm:w-[420px] h-3 bg-slate-400 dark:bg-slate-500 mt-2 rounded"></div>
                        </div>
                    </div>
                )}

                {/* Level 3: ROOMS */}
                {viewLevel === "rooms" && activeBlock && activeFloor && (
                    <div className="flex-1 flex flex-col items-center justify-start pt-4">
                        <div className="w-full flex justify-between items-center gap-3 mb-10 border-b-2 border-[#1f2937] pb-4 ml-0 sm:ml-20">
                            <h3 className="font-bold text-slate-500 uppercase tracking-widest">Floor Plan Editor</h3>
                            <div className="flex gap-3">
                                <button onClick={addRoom} className="flex items-center gap-1.5 bg-[#0b1220] border-2 border-indigo-200 text-blue-600 dark:text-blue-400 hover:bg-[#8b5cf6]/10 px-4 py-2 rounded-lg font-bold text-sm shadow-sm"><Plus className="w-4 h-4"/> Add Room</button>
                                <button onClick={deleteRoom} className="flex items-center gap-1.5 bg-[#0b1220] border-2 border-slate-200 text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-lg font-bold text-sm shadow-sm"><Trash2 className="w-4 h-4"/> Remove Room</button>
                            </div>
                        </div>

                        {/* Top Down Floor Plan */}
                        <div className="bg-slate-200 dark:bg-slate-700/80 p-8 sm:p-12 border-[8px] border-slate-400 dark:border-slate-500 rounded-lg max-w-4xl w-full flex flex-wrap gap-4 sm:gap-6 justify-center shadow-inner relative">
                            {activeFloor.rooms.length === 0 && <span className="font-bold text-slate-500 uppercase py-10 w-full text-center">Empty floor</span>}
                            
                            {activeFloor.rooms.map((r, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => { setActiveRoomIndex(i); setViewLevel("beds"); }}
                                    className={`group cursor-pointer bg-[#0b1220] border-4 ${r.occupiedBeds && r.occupiedBeds > 0 ? "border-emerald-400" : "border-slate-300 dark:border-slate-600 hover:border-indigo-500"} w-32 h-32 sm:w-40 sm:h-40 flex flex-col items-center justify-center transition-all hover:scale-105 shadow-md relative`}
                                >
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest absolute top-2 bg-[#020617] border border-[#1f2937] px-2 py-0.5 rounded">Setup</span>
                                    
                                    <input 
                                        value={r.roomNo}
                                        onChange={e => updateRoomNo(activeBlockIndex!, activeFloorIndex!, i, e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        className="text-center font-black text-3xl bg-[#020617] border-none outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1 w-full text-slate-800 dark:text-slate-100 transition-all mt-4 mb-2"
                                    />
                                    
                                    <span className={`font-bold uppercase text-[10px] flex items-center gap-1 mt-auto pb-2 ${r.occupiedBeds && r.occupiedBeds > 0 ? "text-emerald-500" : "text-blue-500"}`}>
                                        <BedDouble className="w-3.5 h-3.5"/> 
                                        {r.occupiedBeds && r.occupiedBeds > 0 ? `${r.occupiedBeds}/${r.capacity} Occupied` : `${r.capacity} Beds Total`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Level 4: BEDS */}
                {viewLevel === "beds" && activeBlock && activeFloor && activeRoom && (
                    <div className="flex-1 flex flex-col items-center justify-start pt-4">
                        <div className="w-full flex justify-end gap-3 mb-10 border-b-2 border-[#1f2937] pb-4">
                            <h3 className="font-bold text-slate-500 uppercase tracking-widest w-full self-center ml-0 sm:ml-20">Room Bed Capacity</h3>
                        </div>

                        {/* Top down room plan for beds */}
                        <div className="bg-[#0b1220] border-[8px] border-slate-400 dark:border-slate-500 rounded-lg p-10 max-w-2xl w-full flex flex-col items-center shadow-inner relative min-h-[400px]">
                            {/* Room door marker */}
                            <div className="absolute bottom-[-8px] left-[60px] w-20 h-[8px] bg-amber-500"></div>

                            <p className="text-center text-slate-400 font-bold tracking-widest uppercase text-xs mb-8">Capacity Configuration Layout</p>

                            <div className="flex justify-center flex-wrap gap-8 items-center w-full mb-12">
                                {Array.from({ length: activeRoom.capacity }).map((_, i) => {
                                    const isOccupied = activeRoom.occupiedBeds && i < activeRoom.occupiedBeds;
                                    return (
                                        <div key={i} className={`w-20 h-32 rounded flex flex-col items-center justify-start pt-4 shadow-sm relative ${isOccupied ? 'bg-emerald-50 border-4 border-emerald-400' : 'bg-indigo-50 border-4 border-dashed border-indigo-400'}`}>
                                            <div className={`w-12 h-6 rounded-full border-2 mb-2 ${isOccupied ? 'bg-emerald-200 border-emerald-500' : 'bg-white border-indigo-200'}`}></div>
                                            <span className={`font-black text-2xl absolute inset-0 flex items-center justify-center ${isOccupied ? 'text-emerald-500' : 'text-indigo-300'}`}>{i+1}</span>
                                            {isOccupied && <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-bold text-emerald-600 uppercase">Occupied</span>}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-auto flex items-center gap-6 bg-[#020617] border-2 border-slate-300 dark:border-slate-700 p-4 rounded-2xl w-full justify-between shadow-sm">
                                <span className="font-black text-[#9ca3af] uppercase tracking-widest text-sm pl-4">Add or Remove Beds</span>
                                <div className="flex gap-4 pr-2">
                                    <button onClick={deleteBed} className="w-12 h-12 bg-[#0b1220] border-2 border-rose-200 text-rose-500 font-black text-2xl flex items-center justify-center rounded-xl hover:bg-rose-50 transition-colors shadow-sm">-</button>
                                    <div className="w-16 flex items-center justify-center font-black text-2xl text-[#f9fafb] bg-[#0b1220] border-2 border-slate-200 dark:border-slate-600 rounded-xl shadow-sm">{activeRoom.capacity}</div>
                                    <button onClick={addBed} className="w-12 h-12 bg-[#0b1220] border-2 border-emerald-200 text-emerald-500 font-black text-2xl flex items-center justify-center rounded-xl hover:bg-emerald-50 transition-colors shadow-sm">+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* WA Configuration Card */}
            <div className="bg-slate-900 border border-[#1f2937] rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                        <span className="font-black text-white flex items-center gap-2 uppercase tracking-wide">WhatsApp Automation</span>
                        <span className="font-semibold text-xs text-slate-500 mt-1">Configure automated notifications for renewals</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-4 py-2 rounded-xl border border-white/10 shadow-lg">
                        <span className={`text-sm font-black ${whatsappEnabled ? 'text-blue-400' : 'text-slate-500'} uppercase tracking-widest`}>{whatsappEnabled ? 'ON' : 'OFF'}</span>
                        <input type="checkbox" checked={whatsappEnabled} onChange={e => setWhatsappEnabled(e.target.checked)} className="accent-blue-500 w-4 h-4 ml-2" />
                    </label>
                </div>
                {whatsappEnabled && (
                    <div className="mt-6 border-t-2 border-[#1f2937] pt-6">
                        <label className="block font-bold text-slate-500 uppercase tracking-widest text-xs mb-3">Message Format</label>
                        <textarea 
                            value={whatsappTemplate} 
                            onChange={e => setWhatsappTemplate(e.target.value)} 
                            rows={3} 
                            className="w-full bg-[#0b1220] border-2 border-slate-300 dark:border-slate-600 rounded-xl p-4 text-sm font-semibold focus:border-indigo-500 outline-none resize-y"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
