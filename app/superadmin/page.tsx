import { Users, Droplets, Target, Activity, Plus, ShieldAlert, MonitorPlay } from "lucide-react";
import { dbConnect } from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { Member } from "@/models/Member";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboard() {
    let pools: any[] = [];
    let totalPools = 0;
    let activePools = 0;
    let totalMembersCount = 0;

    try {
        await dbConnect();
        pools = await Pool.find({}).sort({ createdAt: -1 }).lean() as any[];
        totalPools = pools.length;
        activePools = pools.filter(p => p.status === "ACTIVE").length;
        totalMembersCount = await Member.countDocuments({});
    } catch (err) {
        console.error("SuperAdmin dashboard DB error:", err);
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white drop-shadow-sm">Platform Overview</h1>
                <p className="text-neutral-400 mt-2 text-lg">Monitor all tenant pools, active subscriptions, and platform revenue.</p>
            </div>
            
            {/* Top Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Associated Pools" value={totalPools.toString()} icon={<Droplets className="w-5 h-5" />} trend="All Time" trendUp={true} />
                <StatCard title="Active Pools" value={activePools.toString()} icon={<Activity className="w-5 h-5" />} trend="Operational" trendUp={true} />
                <StatCard title="Total Platform Members" value={totalMembersCount.toString()} icon={<Users className="w-5 h-5" />} trend="Registered" trendUp={true} />
                <StatCard title="Platform Status" value="Online" icon={<Target className="w-5 h-5" />} trend="Serving Traffic" trendUp={true} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Pools Panel */}
                <div className="lg:col-span-2 bg-neutral-900/60 border border-neutral-800/80 rounded-3xl p-8 shadow-xl backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                    
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <h2 className="text-xl font-medium text-white">Recent Pool Registrations</h2>
                        <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">View All →</button>
                    </div>
                    
                    <div className="space-y-4 relative z-10 w-full overflow-y-auto max-h-[400px]">
                        {pools.length === 0 ? (
                            <p className="text-neutral-500">No pools registered yet.</p>
                        ) : (
                            pools.slice(0, 10).map(pool => (
                                <PoolListItem 
                                    key={pool._id.toString()}
                                    name={pool.poolName} 
                                    plan={"Subscription"} 
                                    id={pool.poolId} 
                                    status={pool.status} 
                                    capacity={pool.capacity || 100} 
                                    isSuspended={pool.status === "SUSPENDED"} 
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions Panel */}
                <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-3xl p-8 shadow-xl backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                    <h2 className="text-xl font-medium mb-8 text-white relative z-10">Quick Actions</h2>
                    
                    <div className="space-y-4 relative z-10 flex flex-col h-[calc(100%-4rem)]">
                        <ActionButton icon={<Plus className="w-4 h-4" />} label="Onboard New Pool SaaS" primary />
                        <ActionButton icon={<MonitorPlay className="w-4 h-4" />} label="View Tenant Consoles" />
                        <div className="flex-1" />
                        <div className="pt-6 border-t border-neutral-800">
                            <ActionButton icon={<ShieldAlert className="w-4 h-4" />} label="Suspend a Tenant Pool" danger />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, trend, trendUp }: { title: string, value: string, icon: React.ReactNode, trend: string, trendUp: boolean }) {
    return (
        <div className="p-7 rounded-3xl bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-xl flex flex-col gap-5 shadow-lg relative overflow-hidden group hover:border-neutral-700 transition-colors">
            {/* Subtle top glare */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center justify-between text-neutral-400">
                <span className="text-sm font-semibold tracking-wide">{title}</span>
                <div className="p-2 bg-white/5 rounded-xl border border-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] text-blue-400">
                    {icon}
                </div>
            </div>
            <div>
                <h3 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">{value}</h3>
                <p className={`text-xs font-medium mt-3 flex items-center gap-1 ${trendUp ? 'text-emerald-400' : 'text-neutral-500'}`}>
                    {trendUp && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                    {trend}
                </p>
            </div>
        </div>
    );
}

function PoolListItem({ name, plan, id, status, capacity, isSuspended = false }: { name: string, plan: string, id: string, status: string, capacity: number, isSuspended?: boolean }) {
    return (
        <div className="group flex items-center justify-between p-5 rounded-2xl bg-black/40 border border-neutral-800/50 hover:bg-black/60 hover:border-neutral-700/50 transition-all">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-800 to-black border border-neutral-700/50 flex items-center justify-center text-xs font-bold text-neutral-400 shadow-inner group-hover:text-white transition-colors">
                    {name.charAt(0)}
                </div>
                <div>
                    <p className="font-semibold text-white tracking-wide">{name}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-neutral-500 bg-white/5 px-1.5 py-0.5 rounded">{id}</span>
                        <span className="text-xs text-neutral-400 font-medium">• {plan}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-8">
                {/* Capacity Bar */}
                <div className="hidden md:flex flex-col gap-1.5 w-32">
                    <div className="flex justify-between text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                        <span>Capacity</span>
                        <span>{capacity}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div className={`h-full ${capacity > 85 ? 'bg-red-500' : capacity > 60 ? 'bg-yellow-500' : 'bg-blue-500'} rounded-full`} style={{ width: `${capacity}%` }} />
                    </div>
                </div>
                {/* Status Badge */}
                <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border ${
                    isSuspended 
                    ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                    {status}
                </span>
            </div>
        </div>
    );
}

function ActionButton({ icon, label, primary, danger }: { icon: React.ReactNode, label: string, primary?: boolean, danger?: boolean }) {
    return (
        <button className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all font-medium text-sm border shadow-sm ${
            primary 
            ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500 hover:border-blue-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]' 
            : danger
            ? 'bg-red-500/5 text-red-400 border-red-500/10 hover:bg-red-500/10'
            : 'bg-white/5 text-neutral-300 border-white/5 hover:bg-white/10 hover:text-white'
        }`}>
            {icon}
            {label}
        </button>
    );
}
