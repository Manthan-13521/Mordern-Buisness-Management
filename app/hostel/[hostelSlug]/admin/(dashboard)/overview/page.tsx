"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users, Building2, Layers, Grid, BedDouble, ChevronRight, ArrowLeft } from "lucide-react";

type BedData = { bedNo: number; isOccupied: boolean; member: any | null; };
type RoomData = { _id: string; roomNo: string; capacity: number; occupiedBeds: number; vacantBeds: number; beds: BedData[]; };
type FloorData = { _id: string; floorNo: string; roomsCount: number; bedsCount: number; occupiedBeds: number; vacantBeds: number; rooms: RoomData[]; };
type BlockData = { _id: string; name: string; totalRooms: number; totalBeds: number; occupiedBeds: number; vacantBeds: number; floors: FloorData[]; };

export default function OverviewPage() {
    const params = useParams();
    const router = useRouter();
    const hostelSlug = params.hostelSlug as string;

    const [blocks, setBlocks] = useState<BlockData[]>([]);
    const [loading, setLoading] = useState(true);

    const [viewLevel, setViewLevel] = useState<"blocks"|"floors"|"rooms"|"beds">("blocks");
    const [selectedBlock, setSelectedBlock] = useState<BlockData | null>(null);
    const [selectedFloor, setSelectedFloor] = useState<FloorData | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);

    // Modal States
    const [showMemberDetails, setShowMemberDetails] = useState<BedData | null>(null);

    const fetchStructure = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/hostel/structure");
            const data = await res.json();
            if (data.success) {
                setBlocks(data.data || []);
                if (selectedBlock) {
                    const foundBlock = data.data.find((b: BlockData) => b._id === selectedBlock._id);
                    setSelectedBlock(foundBlock || null);
                    if (foundBlock && selectedFloor) {
                        const foundFloor = foundBlock.floors.find((f: FloorData) => f._id === selectedFloor._id);
                        setSelectedFloor(foundFloor || null);
                        if (foundFloor && selectedRoom) {
                            const foundRoom = foundFloor.rooms.find((r: RoomData) => r._id === selectedRoom._id);
                            setSelectedRoom(foundRoom || null);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    }, [selectedBlock, selectedFloor, selectedRoom]);

    useEffect(() => { fetchStructure(); }, []);

    const goBack = () => {
        if (viewLevel === "beds") setViewLevel("rooms");
        else if (viewLevel === "rooms") setViewLevel("floors");
        else if (viewLevel === "floors") setViewLevel("blocks");
    };

    const handleAssignMember = (bedNo: number) => {
        if (!selectedBlock || !selectedFloor || !selectedRoom) return;
        const query = new URLSearchParams({
            openAdd: "true",
            blockNo: selectedBlock.name,
            floorNo: selectedFloor.floorNo,
            roomNo: selectedRoom.roomNo,
            bedNo: String(bedNo)
        }).toString();
        router.push(`/hostel/${hostelSlug}/admin/members?${query}`);
    };

    if (loading && blocks.length === 0) return (
        <div className="flex justify-center items-center h-64 font-bold text-slate-500 animate-pulse">
            Loading Architecture...
        </div>
    );

    const Breadcrumb = () => (
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500 mb-6 bg-white dark:bg-slate-800 p-3 rounded-xl border-b-4 border-slate-200 dark:border-slate-700 shadow-sm w-full">
            <button onClick={() => setViewLevel("blocks")} className={`hover:text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1.5 ${viewLevel === "blocks" ? "text-blue-600 dark:text-blue-400" : ""}`}>
                <Building2 className="w-4 h-4" /> Overview
            </button>
            {selectedBlock && viewLevel !== "blocks" && (
                <>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                    <button onClick={() => setViewLevel("floors")} className={`hover:text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1 text-sm ${viewLevel === "floors" ? "text-blue-600 dark:text-blue-400" : ""}`}>
                        <Layers className="w-3.5 h-3.5"/> Block {selectedBlock.name}
                    </button>
                </>
            )}
            {selectedFloor && (viewLevel === "rooms" || viewLevel === "beds") && (
                <>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                    <button onClick={() => setViewLevel("rooms")} className={`hover:text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1 text-sm ${viewLevel === "rooms" ? "text-blue-600 dark:text-blue-400" : ""}`}>
                        <Grid className="w-3.5 h-3.5"/> Floor {selectedFloor.floorNo}
                    </button>
                </>
            )}
            {selectedRoom && viewLevel === "beds" && (
                <>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                    <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 text-sm"><BedDouble className="w-3.5 h-3.5"/> Room {selectedRoom.roomNo}</span>
                </>
            )}
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase flex items-center gap-2">
                <span className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 p-2 rounded-lg text-white"><Building2 className="w-6 h-6"/></span>
                Hostel Overview
            </h1>
            
            <Breadcrumb />

            <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl min-h-[500px] flex flex-col p-6 relative overflow-hidden shadow-inner">
                
                {viewLevel !== "blocks" && (
                    <button onClick={goBack} className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-300 font-bold px-4 py-2 rounded-xl transition-all shadow-sm">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                )}

                {/* Level 1: BLOCKS -> Show buildings */}
                {viewLevel === "blocks" && (
                    <div className="flex-1 flex flex-col items-center justify-center pt-8">
                        <p className="text-slate-500 font-bold tracking-widest uppercase mb-12 text-sm text-center w-full">Select a building block</p>
                        
                        <div className="flex flex-wrap justify-center items-end gap-12 sm:gap-20">
                            {blocks.map((b) => (
                                <div 
                                    key={b._id} 
                                    onClick={() => { setSelectedBlock(b); setViewLevel("floors"); }}
                                    className="group cursor-pointer flex flex-col items-center transition-all hover:scale-105"
                                >
                                    {/* Building Structure */}
                                    <div className="relative flex flex-col items-center">
                                        {/* Nice stepped roof */}
                                        <div className="w-24 h-4 bg-slate-400 dark:bg-slate-600 rounded-t-sm group-hover:bg-indigo-400 transition-colors"></div>
                                        <div className="w-32 h-6 bg-slate-300 dark:bg-slate-500 rounded-t-sm group-hover:bg-blue-50 dark:hover:bg-blue-500/100 transition-colors shadow-sm z-10"></div>
                                        
                                        {/* Building Body */}
                                        <div className="w-40 min-h-[220px] bg-slate-100 dark:bg-slate-800 border-x border-t border-slate-300 dark:border-slate-700 flex flex-col-reverse p-3 shadow-2xl group-hover:border-indigo-400 group-hover:shadow-indigo-500/20 transition-all rounded-b-md border-b-[8px] border-b-slate-400 dark:border-b-slate-900">
                                            
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
                                                {b.floors.map((_, i) => (
                                                    <div key={i} className="w-full flex justify-around px-1">
                                                        {/* 3 Windows per floor */}
                                                        <div className="w-6 h-8 bg-sky-200 dark:bg-sky-900/60 border-b-4 border-slate-300 dark:border-slate-700 rounded-t-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800/40 transition-colors relative"><div className="absolute top-0 right-1 w-1 h-4 bg-white/40 rotate-[20deg] rounded-full"></div></div>
                                                        <div className="w-6 h-8 bg-sky-200 dark:bg-sky-900/60 border-b-4 border-slate-300 dark:border-slate-700 rounded-t-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800/40 transition-colors relative"><div className="absolute top-0 right-1 w-1 h-4 bg-white/40 rotate-[20deg] rounded-full"></div></div>
                                                        <div className="w-6 h-8 bg-sky-200 dark:bg-sky-900/60 border-b-4 border-slate-300 dark:border-slate-700 rounded-t-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800/40 transition-colors relative"><div className="absolute top-0 right-1 w-1 h-4 bg-white/40 rotate-[20deg] rounded-full"></div></div>
                                                    </div>
                                                ))}
                                                {b.floors.length === 0 && <div className="text-center text-[9px] text-slate-400 font-bold py-6 uppercase tracking-widest leading-tight">Under<br/>Construction</div>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6 text-center">
                                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest group-hover:text-blue-600 dark:text-blue-400 transition-colors">Block {b.name}</h3>
                                        <div className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex gap-4">
                                            <div className="flex flex-col"><span className="text-emerald-500 text-lg">{b.occupiedBeds}</span> Occupied</div>
                                            <div className="flex flex-col"><span className="text-rose-500 text-lg">{b.vacantBeds}</span> Vacant</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Level 2: FLOORS -> Show stacked floors of the selected building */}
                {viewLevel === "floors" && selectedBlock && (
                    <div className="flex-1 flex flex-col items-center justify-center pt-8">
                        <p className="text-slate-500 font-bold tracking-widest uppercase mb-8 text-sm text-center w-full">Block {selectedBlock.name} - Select a floor</p>
                        
                        <div className="flex flex-col-reverse justify-end items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-6 rounded-t-xl border-x-4 border-t-4 border-slate-300 dark:border-slate-600 min-w-[320px] shadow-2xl relative">
                            {/* Small symbolic roof */}
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[calc(100%+16px)] h-6 bg-slate-300 dark:bg-slate-600 rounded-t-lg"></div>

                            {selectedBlock.floors.map((f) => (
                                <div 
                                    key={f._id} 
                                    onClick={() => { setSelectedFloor(f); setViewLevel("rooms"); }}
                                    className="w-[280px] sm:w-[360px] h-16 sm:h-20 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-500 rounded flex justify-between items-center px-6 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:bg-indigo-900/40 hover:border-indigo-400 group transition-all"
                                >
                                    <span className="text-2xl font-black text-slate-800 dark:text-white group-hover:text-blue-600 dark:text-blue-400 transition-colors">{f.floorNo}</span>
                                    <div className="flex gap-4 text-xs font-bold uppercase tracking-wider text-right text-slate-500 group-hover:text-blue-500">
                                        <div className="flex flex-col"><span className="text-emerald-500 text-base">{f.occupiedBeds}</span> Inside</div>
                                        <div className="flex flex-col"><span className="text-rose-500 text-base">{f.vacantBeds}</span> Free</div>
                                    </div>
                                </div>
                            ))}
                            {/* Foundation Line */}
                            <div className="w-[300px] sm:w-[380px] h-2 bg-slate-400 dark:bg-slate-500 mt-2 rounded"></div>
                        </div>
                    </div>
                )}

                {/* Level 3: ROOMS -> Show top-down floor plan containing rooms */}
                {viewLevel === "rooms" && selectedBlock && selectedFloor && (
                    <div className="flex-1 flex flex-col items-center justify-center pt-8">
                        <p className="text-slate-500 font-bold tracking-widest uppercase mb-6 text-sm text-center w-full">Floor {selectedFloor.floorNo} - Layout Map</p>
                        
                        {/* Floor Boundary Box */}
                        <div className="bg-slate-200 dark:bg-slate-700/80 p-6 sm:p-10 border-[6px] border-slate-400 dark:border-slate-600 rounded-xl max-w-4xl w-full flex flex-wrap gap-4 sm:gap-6 justify-center shadow-inner relative">
                            {selectedFloor.rooms.map((r) => {
                                const isFull = r.vacantBeds === 0;
                                const isEmpty = r.occupiedBeds === 0;

                                return (
                                    <div 
                                        key={r._id} 
                                        onClick={() => { setSelectedRoom(r); setViewLevel("beds"); }}
                                        className={`group cursor-pointer bg-white dark:bg-slate-800 border-4 w-28 h-28 sm:w-32 sm:h-32 flex flex-col items-center justify-center transition-all hover:scale-105 shadow-md
                                            ${isFull ? 'border-emerald-400' : isEmpty ? 'border-rose-400' : 'border-indigo-400'}
                                        `}
                                    >
                                        <span className="text-3xl font-black text-slate-800 dark:text-white mb-2">{r.roomNo}</span>
                                        <div className="flex justify-center gap-1 px-2 flex-wrap">
                                            {Array.from({length: r.capacity}).map((_, i) => (
                                                <div key={i} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${i < r.occupiedBeds ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600 border border-slate-300 dark:border-slate-500'}`}></div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Level 4: BEDS -> Show top-down room plan containing beds */}
                {viewLevel === "beds" && selectedBlock && selectedFloor && selectedRoom && (
                    <div className="flex-1 flex flex-col items-center justify-center pt-8">
                        <p className="text-slate-500 font-bold tracking-widest uppercase mb-6 text-sm text-center w-full">Room {selectedRoom.roomNo} Space</p>
                        
                        {/* Room Boundary Box */}
                        <div className="bg-white dark:bg-slate-800 border-[6px] border-slate-400 dark:border-slate-600 rounded-xl p-8 sm:p-16 max-w-2xl w-full flex flex-wrap gap-10 items-center justify-center shadow-inner relative min-h-[300px]">
                            {/* A door indicator just for architectural feel */}
                            <div className="absolute bottom-[-6px] left-[50px] w-16 h-[6px] bg-amber-500"></div>

                            {selectedRoom.beds.map((bed, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => bed.isOccupied ? setShowMemberDetails(bed) : handleAssignMember(bed.bedNo)}
                                    className={`relative w-20 h-32 sm:w-24 sm:h-40 rounded-lg flex flex-col items-center justify-start pt-6 border-4 shadow-md cursor-pointer hover:scale-110 transition-transform
                                        ${bed.isOccupied 
                                            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500' 
                                            : 'bg-rose-50 dark:bg-rose-900/30 border-rose-400 border-dashed'}
                                    `}
                                >
                                    {/* Pillow shape layout */}
                                    <div className="w-12 h-6 sm:w-16 sm:h-8 rounded-full bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 mb-auto"></div>
                                    
                                    <span className={`text-2xl font-black absolute top-1/2 -translate-y-1/2 ${bed.isOccupied ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                        {bed.bedNo}
                                    </span>

                                    {bed.isOccupied && bed.member && (
                                        <div className="w-full bg-emerald-500 text-white text-[10px] font-bold text-center py-1 mt-auto uppercase truncate px-1">
                                            {bed.member.name.split(' ')[0]}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* MEMBER DETAILS MODAL */}
            {showMemberDetails && showMemberDetails.member && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowMemberDetails(null)} />
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border-4 border-slate-300 dark:border-slate-600">
                        <div className="p-4 bg-slate-100 dark:bg-slate-900 flex justify-between items-center border-b-2 border-slate-200 dark:border-slate-700">
                            <h3 className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-sm">Bed Profile</h3>
                            <button onClick={() => setShowMemberDetails(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                        </div>
                        <div className="p-6">
                            <div className="flex gap-4 items-center">
                                <div className="h-20 w-20 rounded-full border-4 border-emerald-500 flex items-center justify-center bg-slate-50 overflow-hidden">
                                     {showMemberDetails.member.photoUrl ? (
                                        <img src={showMemberDetails.member.photoUrl} alt="Photo" className="h-full w-full object-cover" />
                                    ) : (
                                        <Users className="h-10 w-10 text-slate-400" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-black text-xl text-slate-800 dark:text-white uppercase leading-tight">{showMemberDetails.member.name}</p>
                                    <p className="text-sm font-bold text-slate-500 mt-1">{showMemberDetails.member.phone}</p>
                                </div>
                            </div>
                            
                            <hr className="my-6 border-slate-200 dark:border-slate-700 border-dashed" />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Join Date</p>
                                    <p className="font-black text-sm text-slate-700 dark:text-slate-300">
                                        {new Date(showMemberDetails.member.planStartDate).toLocaleDateString("en-IN")}
                                    </p>
                                </div>
                                <div className="bg-rose-50 dark:bg-rose-900/30 p-3 rounded-lg border border-rose-200 dark:border-rose-900/50">
                                    <p className="text-[10px] uppercase font-bold text-rose-400">Expiry Date</p>
                                    <p className="font-black text-sm text-rose-600 dark:text-rose-400">
                                        {new Date(showMemberDetails.member.planEndDate).toLocaleDateString("en-IN")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
