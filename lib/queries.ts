import { unstable_cache } from "next/cache";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { Plan } from "@/models/Plan";
import { NotificationLog } from "@/models/NotificationLog";
import { Payment } from "@/models/Payment";
import { EntryLog } from "@/models/EntryLog";

// Helper: build scoped filter. For superadmin ("superadmin" sentinel), no filter.
// For regular pools, poolId MUST be a non-empty string — otherwise we throw.
function buildPoolFilter(poolId: string): Record<string, string> {
    if (poolId === "superadmin") return {};
    if (!poolId) throw new Error("[queries.ts] poolId is required for tenant-scoped queries");
    return { poolId };
}

// ── IST Timezone Helper ────────────────────────────────────────────────
// Vercel runs in UTC. We must compute IST (UTC+5:30) day boundaries
// so dashboard resets at exactly 12:00 AM India time.
function getISTDayBounds() {
    const now = new Date();
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + IST_OFFSET);

    // Start of day in IST, converted back to UTC for MongoDB queries
    const startOfDayIST = new Date(
        Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0, 0)
    );
    startOfDayIST.setTime(startOfDayIST.getTime() - IST_OFFSET);

    // End of day in IST, converted back to UTC
    const endOfDayIST = new Date(
        Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 23, 59, 59, 999)
    );
    endOfDayIST.setTime(endOfDayIST.getTime() - IST_OFFSET);

    // Start of month in IST, converted back to UTC
    const startOfMonthIST = new Date(
        Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), 1, 0, 0, 0, 0)
    );
    startOfMonthIST.setTime(startOfMonthIST.getTime() - IST_OFFSET);

    // Start of year in IST, converted back to UTC
    const startOfYearIST = new Date(
        Date.UTC(istNow.getUTCFullYear(), 0, 1, 0, 0, 0, 0)
    );
    startOfYearIST.setTime(startOfYearIST.getTime() - IST_OFFSET);

    return { startOfDayIST, endOfDayIST, startOfMonthIST, startOfYearIST, now };
}

/**
 * ── Member list (all members) ──────────────────────────────────────────
 */
export const getCachedMembers = unstable_cache(
    async (poolId: string, page: number = 1, limit: number = 50) => {
        await dbConnect();
        const baseMatch = buildPoolFilter(poolId);
        
        const skip = (page - 1) * limit;
        
        const [members, total] = await Promise.all([
            Member.find({ ...baseMatch, isDeleted: false })
                .populate("planId", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Member.countDocuments({ ...baseMatch, isDeleted: false })
        ]);
        
        return { members, total, page, limit };
    },
    ["cached-members-list"],
    { revalidate: 15 }
);

/**
 * ── Analytics summary data ─────────────────────────────────────────────
 * Used for Today's Revenue and Monthly Revenue on the dashboard.
 */
export const getCachedAnalyticsSummary = unstable_cache(
    async (poolId: string, memberType: string = "all") => {
        await dbConnect();
        const baseMatch = buildPoolFilter(poolId);
        const { startOfDayIST, endOfDayIST, startOfMonthIST, startOfYearIST, now } = getISTDayBounds();

        const paymentMatch = { ...baseMatch };
        if (memberType === "member") paymentMatch.memberCollection = "members";
        if (memberType === "entertainment") paymentMatch.memberCollection = "entertainment_members";

        const memberQueryMatch = { ...baseMatch, isDeleted: false };
        let includeRegular = memberType === "all" || memberType === "member";
        let includeEntertainment = memberType === "all" || memberType === "entertainment";

        const [
            activeRegular,
            activeEntertainment,
            todaysRevenue,
            monthlyRevenue,
            yearlyRevenue,
            entriesToday,
            todaysMemberEntries,
            todaysEntertainmentEntries
        ] = await Promise.all([
            (includeRegular ? Member.countDocuments({
                ...memberQueryMatch,
                memberId: { $regex: /^M(?!S)/i },
                $or: [{ planEndDate: { $gte: now } }, { expiryDate: { $gte: now } }]
            }) : Promise.resolve(0)) as Promise<number>,
            (includeEntertainment ? EntertainmentMember.countDocuments({
                ...memberQueryMatch,
                memberId: { $regex: /^MS/i },
                $or: [{ planEndDate: { $gte: now } }, { expiryDate: { $gte: now } }]
            }) : Promise.resolve(0)) as Promise<number>,
            Payment.aggregate([
                { $match: { ...paymentMatch, status: "success", createdAt: { $gte: startOfDayIST, $lte: endOfDayIST } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            Payment.aggregate([
                { $match: { ...paymentMatch, status: "success", createdAt: { $gte: startOfMonthIST } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            Payment.aggregate([
                { $match: { ...paymentMatch, status: "success", createdAt: { $gte: startOfYearIST } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            EntryLog.aggregate([
                { $match: { ...baseMatch, scanTime: { $gte: startOfDayIST, $lte: endOfDayIST }, status: "granted" } },
                { $group: { _id: null, total: { $sum: { $ifNull: ["$numPersons", 1] } } } }
            ]),
            includeRegular ? Member.countDocuments({
                ...memberQueryMatch,
                memberId: { $regex: /^M(?!S)/i },
                createdAt: { $gte: startOfDayIST, $lte: endOfDayIST }
            }) : 0,
            includeEntertainment ? EntertainmentMember.countDocuments({
                ...memberQueryMatch,
                memberId: { $regex: /^MS/i },
                createdAt: { $gte: startOfDayIST, $lte: endOfDayIST }
            }) : 0
        ]);

        return {
            activeMembers: (activeRegular as number) + (activeEntertainment as number),
            totalRevenue: todaysRevenue[0]?.total || 0,
            monthlyRevenue: monthlyRevenue[0]?.total || 0,
            yearlyRevenue: yearlyRevenue[0]?.total || 0,
            entriesToday: entriesToday[0]?.total || 0,
            todaysMemberEntries,
            todaysEntertainmentEntries,
        };
    },
    ["cached-analytics-summary"],
    { revalidate: 10 }
);

/**
 * ── Plans list ─────────────────────────────────────────────────────────
 */
export const getCachedPlans = unstable_cache(
    async (poolId: string) => {
        await dbConnect();
        const baseMatch = buildPoolFilter(poolId);
        return Plan.find({ ...baseMatch, deletedAt: null }).sort({ createdAt: -1 }).lean();
    },
    ["cached-plans-list"],
    { revalidate: 120 }
);

/**
 * ── Notification logs ──────────────────────────────────────────────────
 */
export const getCachedNotificationLogs = unstable_cache(
    async (poolId: string, limit: number = 50) => {
        await dbConnect();
        const baseMatch = buildPoolFilter(poolId);
        return NotificationLog.find(baseMatch)
            .populate("memberId", "name phone memberId")
            .sort({ date: -1 })
            .limit(limit)
            .lean();
    },
    ["cached-notification-logs"],
    { revalidate: 30 }
);

/**
 * ── Dashboard summary counts ───────────────────────────────────────────
 * Used for Total Members, Active Members, Today's Entries cards.
 */
export const getCachedDashboardCounts = unstable_cache(
    async (poolId: string, memberType: string = "all") => {
        await dbConnect();
        const baseMatch = buildPoolFilter(poolId);
        const { startOfDayIST, endOfDayIST, now } = getISTDayBounds();

        const memberQueryMatch = { ...baseMatch, isDeleted: false };
        let includeRegular = memberType === "all" || memberType === "member";
        let includeEntertainment = memberType === "all" || memberType === "entertainment";

        const [totalRegular, totalEntertainment, activeRegular, activeEntertainment, todaysEntries, todaysMemberEntries, todaysEntertainmentEntries] = await Promise.all([
            includeRegular ? Member.countDocuments({
                ...memberQueryMatch,
                memberId: { $regex: /^M(?!S)/i }
            }) : 0,
            includeEntertainment ? EntertainmentMember.countDocuments({
                ...memberQueryMatch,
                memberId: { $regex: /^MS/i }
            }) : 0,
            includeRegular ? Member.countDocuments({
                ...memberQueryMatch,
                memberId: { $regex: /^M(?!S)/i },
                $or: [{ planEndDate: { $gte: now } }, { expiryDate: { $gte: now } }]
            }) : 0,
            includeEntertainment ? EntertainmentMember.countDocuments({
                ...memberQueryMatch,
                memberId: { $regex: /^MS/i },
                $or: [{ planEndDate: { $gte: now } }, { expiryDate: { $gte: now } }]
            }) : 0,
            EntryLog.aggregate([
                { $match: { ...baseMatch, scanTime: { $gte: startOfDayIST, $lte: endOfDayIST }, status: "granted" } },
                { $group: { _id: null, total: { $sum: { $ifNull: ["$numPersons", 1] } } } }
            ]),
            includeRegular ? Member.countDocuments({
                ...memberQueryMatch,
                memberId: { $regex: /^M(?!S)/i },
                createdAt: { $gte: startOfDayIST, $lte: endOfDayIST }
            }) : 0,
            includeEntertainment ? EntertainmentMember.countDocuments({
                ...memberQueryMatch,
                memberId: { $regex: /^MS/i },
                createdAt: { $gte: startOfDayIST, $lte: endOfDayIST }
            }) : 0
        ]);

        return {
            totalMembers: (totalRegular as number) + (totalEntertainment as number),
            activeMembers: (activeRegular as number) + (activeEntertainment as number),
            todaysEntries: todaysEntries[0]?.total || 0,
            todaysMemberEntries,
            todaysEntertainmentEntries,
        };
    },
    ["cached-dashboard-counts"],
    { revalidate: 10 }
);
