"use client";
import { useState } from "react";
import { Users, UserPlus, Clock, Camera } from "lucide-react";

export default function StaffManagementPage() {
    const [staffList] = useState([
        { id: "STF001", name: "Rahul Sharma", role: "Manager", status: "Active", method: "Face Scan" },
        { id: "STF002", name: "Priya Singh", role: "Trainer", status: "Active", method: "QR Code" },
    ]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Staff & Trainers</h1>
                    <p className="text-neutral-400 mt-1">Manage personnel and monitor attendance.</p>
                </div>
                <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-colors flex items-center gap-2 border border-blue-500">
                    <UserPlus className="w-5 h-5" /> Add Staff
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-3xl p-8 relative overflow-hidden shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                    <h2 className="text-lg font-semibold text-white mb-6 relative z-10">Staff Directory</h2>
                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full text-left bg-black/40 rounded-2xl overflow-hidden border border-neutral-800/80">
                            <thead className="text-[10px] text-neutral-500 uppercase font-bold bg-neutral-900/80 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">ID Code</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {staffList.map((staff, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 text-white font-medium flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/30 shadow-inner">
                                                {staff.name.charAt(0)}
                                            </div>
                                            {staff.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-white/5 text-neutral-300 rounded-full text-xs font-medium border border-white/10">{staff.role}</span>
                                        </td>
                                        <td className="px-6 py-4 text-neutral-400 font-mono text-sm tracking-widest">{staff.id}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-sm text-blue-400 font-medium hover:text-blue-300 transition-colors">Edit</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 relative shadow-xl">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 blur-[60px] pointer-events-none" />
                    <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 relative z-10"><Clock className="w-5 h-5 text-purple-400"/> Live Attendance</h2>
                    <div className="space-y-4 relative z-10">
                        <div className="p-5 rounded-2xl bg-black/40 border border-neutral-800/80 flex flex-col gap-1 relative overflow-hidden shadow-inner hover:bg-black/60 transition-colors">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
                            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider ml-3">Clock In • 08:30 AM</p>
                            <p className="font-semibold text-white ml-3 mt-1 flex items-center justify-between">Rahul Sharma <Camera className="w-4 h-4 text-neutral-500" /></p>
                            <p className="text-xs text-blue-400 ml-3 mt-1.5 font-medium">Face Scan Verified</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-black/40 border border-neutral-800/80 flex flex-col gap-1 relative overflow-hidden shadow-inner hover:bg-black/60 transition-colors">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500" />
                            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider ml-3">Clock Out • 08:15 PM</p>
                            <p className="font-semibold text-white ml-3 mt-1 flex items-center justify-between">Priya Singh <Users className="w-4 h-4 text-neutral-500" /></p>
                            <p className="text-xs text-neutral-500 ml-3 mt-1.5 font-medium">QR Scan Verified</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
