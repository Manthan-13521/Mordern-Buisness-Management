import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { User } from "@/models/User";
import Link from "next/link";
import { Search, Plus, ShieldCheck } from "lucide-react";
import { ResetPasswordButton } from "./ResetPasswordButton";
import { DeletePoolButton } from "./DeletePoolButton";
import { PausePoolButton } from "./PausePoolButton";

export const dynamic = "force-dynamic";

export default async function PlatformPoolsList() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "superadmin") {
        redirect("/superadmin/login");
    }

    await dbConnect();
    const pools = await Pool.find().lean();
    
    // Group pools with their admins if needed
    // For simplicity, just listing pools here.

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Manage Tenants</h1>
                    <p className="text-gray-400">View, monitor, and provision swimming pools across the platform.</p>
                </div>
                <Link href="/subscribe" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 text-white px-4 py-2 font-bold rounded-xl shadow-lg transition flex items-center gap-2">
                    <Plus className="w-5 h-5"/> Add Pool manually
                </Link>
            </div>

            <div className="bg-slate-900 border border-[#1f2937] rounded-2xl overflow-hidden mt-8 shadow-2xl">
                <div className="bg-[#0b1220] p-4 border-b border-[#1f2937] flex items-center justify-between">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                        <input 
                            type="text" 
                            disabled
                            placeholder="Search pools..." 
                            className="bg-slate-950/50 border border-[#1f2937] text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 p-2 placeholder-gray-500"
                        />
                    </div>
                </div>
                <table className="w-full text-sm text-left text-slate-400">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-950/50">
                        <tr>
                            <th scope="col" className="px-6 py-4">Pool Name</th>
                            <th scope="col" className="px-6 py-4">Domain/Slug</th>
                            <th scope="col" className="px-6 py-4">Status</th>
                            <th scope="col" className="px-6 py-4">Admin Credentials</th>
                            <th scope="col" className="px-6 py-4">Joined At</th>
                            <th scope="col" className="px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pools.map((pool: any) => (
                            <tr key={pool._id.toString()} className="border-b border-[#1f2937] hover:bg-[#0b1220] transition-colors">
                                <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                                    {pool.poolName || "Unknown"}
                                    <div className="text-xs text-gray-500 font-normal">{pool.poolId}</div>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-indigo-400">{pool.slug}</td>
                                <td className="px-6 py-4">
                                    <span className={`border text-xs px-2.5 py-1 rounded-full font-medium ${pool.subscriptionStatus === "paused" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                                        {pool.subscriptionStatus === "paused" ? "PAUSED" : (pool.status || "ACTIVE")}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs">
                                    <div className="text-gray-300"><b>Email:</b> {pool.adminEmail}</div>
                                    {pool.adminPhone && (
                                        <div className="text-gray-300 mt-0.5"><b>Phone:</b> {pool.adminPhone}</div>
                                    )}
                                    <div className="text-gray-500 mt-1 flex items-center gap-1.5 font-medium italic">
                                        <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                                        Secure (Not Viewable)
                                    </div>
                                    <div className="mt-3">
                                        <ResetPasswordButton poolId={pool.poolId} poolName={pool.poolName} />
                                        <PausePoolButton poolId={pool.poolId} currentStatus={pool.subscriptionStatus} />
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {pool.createdAt ? new Date(pool.createdAt).toLocaleDateString() : "Just Now"}
                                </td>
                                <td className="px-6 py-4">
                                    <DeletePoolButton poolId={pool.poolId} poolName={pool.poolName} />
                                </td>
                            </tr>
                        ))}
                        {pools.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No pools registered yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
