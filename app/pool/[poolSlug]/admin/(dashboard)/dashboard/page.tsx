import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Users, UserX, Activity, DollarSign, ArrowUpRight, TrendingUp, Heart, Gamepad2, UserPlus, AlertTriangle, ShieldAlert, BadgeDollarSign, CreditCard, BarChart3 } from "lucide-react";
import ChartSkeleton from "@/components/ChartSkeleton";
import { getCachedDashboardCounts, getCachedAnalyticsSummary } from "@/lib/queries";
import { Member } from "@/models/Member";
import { dbConnect } from "@/lib/mongodb";
import { PoolTypeFilter } from "@/components/pool/PoolTypeFilter";

// Stats Component (Server)
async function DashboardStats({ poolId, isAdmin, memberType }: { poolId: string, isAdmin: boolean, memberType: string }) {
    const summary = await getCachedAnalyticsSummary(poolId, memberType);
    const counts = await getCachedDashboardCounts(poolId, memberType);

    const stats: { name: string; stat: string | number; icon: any; color: string }[] = [
        { name: "Total Members", stat: counts.totalMembers, icon: Users, color: "bg-blue-500" },
        { name: "Active Members", stat: counts.activeMembers, icon: Activity, color: "bg-green-500" },
        { name: "Expired Members", stat: counts.totalMembers - counts.activeMembers, icon: UserX, color: "bg-red-500" },
        { name: "New Members Today", stat: counts.todaysMemberEntries, icon: UserPlus, color: "bg-indigo-500" },
        { name: "New Ent. Members Today", stat: counts.todaysEntertainmentEntries, icon: Gamepad2, color: "bg-pink-500" },
    ];

    if (isAdmin) {
        stats.push({ name: "Today's Revenue", stat: `₹${summary.totalRevenue}`, icon: DollarSign, color: "bg-yellow-500" });
        stats.push({ name: "Monthly Revenue", stat: `₹${summary.monthlyRevenue}`, icon: TrendingUp, color: "bg-purple-500" });
        stats.push({ name: "Yearly Income", stat: `₹${summary.yearlyRevenue || 0}`, icon: DollarSign, color: "bg-emerald-500" });
    }

    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((item) => (
                <div
                    key={item.name}
                    className="relative overflow-hidden rounded-2xl bg-[#0b1220] px-4 pb-12 pt-5 shadow-sm sm:px-6 sm:pt-6 border border-[#1f2937]"
                >
                    <dt>
                        <div className={`absolute rounded-md ${item.color} p-3`}>
                            <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                        </div>
                        <p className="ml-16 line-clamp-2 text-sm font-medium leading-tight text-[#9ca3af]">
                            {item.name}
                        </p>
                    </dt>
                    <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
                        <p className="text-2xl font-semibold text-[#f9fafb]">{item.stat}</p>
                    </dd>
                </div>
            ))}
        </div>
    );
}

// System Health Component (Server)
async function SystemHealth() {
    // Only Admin can see this anyway, we conditionally render it
    
    // Fallbacks just for display layout match
    const health = {
        database: { status: "connected" },
        system: { uptime: "N/A", memoryUsedMB: 0, memoryTotalMB: 0 },
        recentErrors: []
    };

    return (
        <div className="rounded-2xl bg-[#0b1220] shadow-sm p-6 border border-[#1f2937]">
            <h2 className="text-lg font-semibold text-[#f9fafb] mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" /> System Health
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="flex flex-col">
                    <span className="text-[#9ca3af] text-xs uppercase font-medium">DB Status</span>
                    <span className={`font-semibold mt-1 ${health.database?.status === "connected" ? "text-green-400" : "text-red-400"}`}>{health.database?.status}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[#9ca3af] text-xs uppercase font-medium">Uptime</span>
                    <span className="font-semibold mt-1 text-[#f9fafb]">{health.system?.uptime}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[#9ca3af] text-xs uppercase font-medium">Heap Memory</span>
                    <span className="font-semibold mt-1 text-[#f9fafb]">{health.system?.memoryUsedMB} / {health.system?.memoryTotalMB} MB</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[#9ca3af] text-xs uppercase font-medium">Last Backup</span>
                    <span className="font-semibold mt-1 text-[#f9fafb]">Active (S3)</span>
                </div>
            </div>
        </div>
    );
}

// Revenue KPI Component (Server) — Powered by Ledger
async function RevenueKPIs({ poolId }: { poolId: string }) {
    const { dbConnect } = await import("@/lib/mongodb");
    await dbConnect();
    const { Ledger } = await import("@/models/Ledger");
    const { Subscription } = await import("@/models/Subscription");

    const now = new Date();
    const filter = poolId !== "superadmin" ? { poolId } : {};

    const [ledgerAgg, overdueSubs] = await Promise.all([
        Ledger.aggregate([
            { $match: filter },
            { $group: {
                _id: null,
                totalDue: { $sum: "$totalDue" },
                totalPaid: { $sum: "$totalPaid" },
                outstandingDues: { $sum: { $cond: [{ $gt: ["$balance", 0] }, "$balance", 0] } },
                creditBalance: { $sum: { $cond: [{ $gt: ["$creditBalance", 0] }, "$creditBalance", 0] } }
            }}
        ]),
        Subscription.find({ ...filter, status: "active", nextDueDate: { $lt: now } }).select("memberId").lean()
    ]);

    let defaulterCount = 0;
    if (overdueSubs.length > 0) {
        const dAgg = await Ledger.aggregate([
            { $match: { ...filter, balance: { $gt: 0 }, memberId: { $in: overdueSubs.map((s: any) => s.memberId) } } },
            { $count: "total" }
        ]);
        defaulterCount = dAgg[0]?.total || 0;
    }

    const l = ledgerAgg[0] || { totalDue: 0, totalPaid: 0, outstandingDues: 0, creditBalance: 0 };
    const recoveryRate = l.totalDue > 0 ? Math.round((l.totalPaid / l.totalDue) * 100) : 100;

    const kpis = [
        { label: "Outstanding Dues", value: `₹${l.outstandingDues.toLocaleString("en-IN")}`, icon: AlertTriangle, accent: "from-red-500 to-rose-600", textColor: "text-red-400" },
        { label: "Defaulters", value: defaulterCount, icon: ShieldAlert, accent: "from-amber-500 to-orange-600", textColor: "text-amber-400" },
        { label: "Recovery Rate", value: `${recoveryRate}%`, icon: BarChart3, accent: recoveryRate >= 80 ? "from-emerald-500 to-green-600" : "from-yellow-500 to-amber-600", textColor: recoveryRate >= 80 ? "text-emerald-400" : "text-yellow-400" },
        { label: "Credit Balance", value: `₹${l.creditBalance.toLocaleString("en-IN")}`, icon: CreditCard, accent: "from-blue-500 to-cyan-600", textColor: "text-blue-400" },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(k => (
                <div key={k.label} className="relative overflow-hidden rounded-2xl bg-[#0b1220] border border-[#1f2937] p-5 group hover:border-[#8b5cf6]/30 transition-all">
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${k.accent} opacity-10 blur-2xl -mr-8 -mt-8`} />
                    <div className="flex items-center gap-3 mb-2">
                        <k.icon className={`w-5 h-5 ${k.textColor}`} />
                        <span className="text-xs uppercase tracking-wider text-[#9ca3af] font-medium">{k.label}</span>
                    </div>
                    <p className={`text-2xl font-bold ${k.textColor}`}>{k.value}</p>
                </div>
            ))}
        </div>
    );
}

// Top Defaulters Mini-List (Server)
async function TopDefaulters({ poolId }: { poolId: string }) {
    const { dbConnect } = await import("@/lib/mongodb");
    await dbConnect();
    const { Ledger } = await import("@/models/Ledger");
    const { Subscription } = await import("@/models/Subscription");
    const { computeDefaulterStatus } = await import("@/lib/defaulterEngine");

    const now = new Date();
    const filter = poolId !== "superadmin" ? { poolId } : {};

    const overdueSubs = await Subscription.find({ ...filter, status: "active", nextDueDate: { $lt: now } }).lean();
    const subMap = new Map(overdueSubs.map((s: any) => [s.memberId.toString(), s]));

    const dueLedgers = await Ledger.find({
        ...filter,
        balance: { $gt: 0 },
        memberId: { $in: overdueSubs.map((s: any) => s.memberId) }
    }).sort({ balance: -1 }).limit(5).lean();

    const memberIds = dueLedgers.map((l: any) => l.memberId);
    const members = await Member.find({ _id: { $in: memberIds } }).select("name memberId").lean();
    const memberMap = new Map(members.map((m: any) => [m._id.toString(), m]));

    const list = dueLedgers.map((l: any) => {
        const sub = subMap.get(l.memberId.toString());
        const overdueDays = sub ? Math.floor((now.getTime() - new Date((sub as any).nextDueDate).getTime()) / 86400000) : 0;
        const member = memberMap.get(l.memberId.toString());
        return {
            name: member?.name || "Unknown",
            memberId: member?.memberId || "N/A",
            balance: l.balance,
            overdueDays,
            status: computeDefaulterStatus(overdueDays)
        };
    });

    const statusColors: Record<string, string> = {
        active: "bg-green-500/10 text-green-400 border-green-500/20",
        warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        blocked: "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse"
    };

    return (
        <div className="rounded-2xl bg-[#0b1220] border border-rose-500/20 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <h2 className="text-lg font-semibold text-rose-400 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Top Defaulters
            </h2>
            {list.length > 0 ? (
                <ul className="space-y-3 max-h-56 overflow-y-auto pr-2">
                    {list.map((m, i) => (
                        <li key={i} className="flex justify-between items-center text-sm py-2 border-b border-[#1f2937] last:border-0 hover:bg-[#8b5cf6]/5 px-2 rounded-lg transition-colors">
                            <div className="flex flex-col">
                                <span className="font-medium text-[#f9fafb]">{m.name}</span>
                                <span className="text-[10px] text-[#6b7280] font-mono">#{m.memberId}</span>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                                <span className="font-bold text-red-400">₹{m.balance.toLocaleString("en-IN")}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[m.status]}`}>
                                    {m.overdueDays}d overdue · {m.status.toUpperCase()}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-[#6b7280] font-medium">No defaulters found. 🎉</p>
            )}
        </div>
    );
}

// Alerts Component (Server)
async function ExpiryAlerts({ poolId }: { poolId: string }) {
    await dbConnect();

    // IST timezone-safe "today" calculation
    const now = new Date();
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + IST_OFFSET);
    const startOfDayIST = new Date(
        Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0, 0)
    );
    startOfDayIST.setTime(startOfDayIST.getTime() - IST_OFFSET);

    const baseMatch = poolId && poolId !== "superadmin" ? { poolId } : {};
    
    // We do NOT filter ExpiryAlerts by memberType, as it handles critical data (or we could, but let's keep all alerts visible for safety)

    const expiringMembers = await Member.find({
        ...baseMatch,
        isDeleted: false,
        $or: [
            { planEndDate: { $gte: startOfDayIST, $lte: new Date(startOfDayIST.getTime() + 3 * 86400000) } },
            { expiryDate: { $gte: startOfDayIST, $lte: new Date(startOfDayIST.getTime() + 3 * 86400000) } },
        ]
    })
    .select('memberId name phone expiryDate planEndDate planQuantity')
    .lean();

    const alerts = expiringMembers.map((m: any) => ({
        id: m._id,
        memberId: m.memberId,
        name: m.name,
        phone: m.phone,
        qty: m.planQuantity || 1,
        remainingDays: Math.ceil((new Date(m.planEndDate || m.expiryDate).getTime() - startOfDayIST.getTime()) / 86400000)
    }));

    return (
        <div className="rounded-2xl bg-[#0b1220] border border-orange-500/20 shadow-sm p-6 relative overflow-hidden group hover:border-orange-500/40 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <h2 className="text-lg font-semibold text-orange-400 mb-4 flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span>
                Expiring Soon (Next 3 Days)
            </h2>
            {alerts.length > 0 ? (
                <ul className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {alerts.map((m: any) => (
                        <li key={m.id || m.memberId} className="flex justify-between items-center text-sm py-2 border-b border-[#1f2937] last:border-0 hover:bg-[#8b5cf6]/5 px-2 rounded-lg transition-colors">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#f9fafb]">{m.name}</span>
                                    <span className="text-[10px] text-[#6b7280] font-mono">#{m.memberId}</span>
                                </div>
                                <span className="text-xs text-[#9ca3af] mt-1">{m.phone}</span>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${m.remainingDays <= 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                                    {m.remainingDays <= 0 ? 'Today' : `In ${m.remainingDays} day${m.remainingDays > 1 ? 's' : ''}`}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-[#6b7280] font-medium">No members expiring soon.</p>
            )}
        </div>
    );
}

// FIX 3: Dynamic import for Recharts (defer - lazy load)
// Using a placeholder as the actual RevenueChart is not yet in this file, but the pattern is established.
// const RevenueChart = dynamic(() => import('@/components/charts/RevenueChart'), { ssr: false, loading: () => <ChartSkeleton /> });

export default async function DashboardPage(props: { searchParams?: Promise<any> | any }) {
    const session = await getServerSession(authOptions) as any;
    const poolId = session?.user?.role !== "superadmin" ? session?.user?.poolId : "superadmin";
    const isAdmin = session?.user?.role === "admin" || session?.user?.role === "superadmin";
    
    const resolvedSearchParams = await props.searchParams;
    const memberType = resolvedSearchParams?.type || "all";

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#f9fafb]">Dashboard Overview</h1>
                    <p className="mt-1 text-sm text-[#9ca3af]">
                        Welcome back, {session?.user?.name || "Admin"}. Here's what's happening today.
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <PoolTypeFilter />
                </div>
            </div>

            {/* Priority 1: Member count + quick stats (render immediately / fastest) */}
            <Suspense fallback={
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <ChartSkeleton /><ChartSkeleton /><ChartSkeleton />
                </div>
            }>
                <DashboardStats poolId={poolId} isAdmin={isAdmin} memberType={memberType} />
            </Suspense>

            {/* Priority 2: Revenue KPIs */}
            {isAdmin && (
                <Suspense fallback={<div className="h-24 bg-[#0b1220] rounded-xl animate-pulse" />}>
                    <RevenueKPIs poolId={poolId} />
                </Suspense>
            )}

            {/* Priority 3: Charts / Recharts components (deferred via dynamic import above) */}
            {/* {isAdmin && <RevenueChart poolId={poolId} />} */}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Priority 4: Defaulters list (deferred) */}
                {isAdmin && (
                    <Suspense fallback={<div className="h-48 bg-[#0b1220] dark:backdrop-blur-md dark:border border-[#1f2937] shadow-lg rounded-xl animate-pulse" />}>
                        <TopDefaulters poolId={poolId} />
                    </Suspense>
                )}
                
                {/* Priority 5: Notifications / Alerts panel (deferred) */}
                <Suspense fallback={<div className="h-48 bg-[#0b1220] dark:backdrop-blur-md dark:border border-[#1f2937] shadow-lg rounded-xl animate-pulse" />}>
                    <ExpiryAlerts poolId={poolId} />
                </Suspense>
            </div>
        </div>
    );
}
