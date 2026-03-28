import { unstable_cache } from "next/cache";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { Plan } from "@/models/Plan";
import { NotificationLog } from "@/models/NotificationLog";
import { Payment } from "@/models/Payment";
import { EntryLog } from "@/models/EntryLog";

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
        const baseMatch = poolId && poolId !== "superadmin" ? { poolId } : {};
        
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
    async (poolId: string) => {
        await dbConnect();
        const baseMatch = poolId && poolId !== "superadmin" ? { poolId } : {};
        const { startOfDayIST, endOfDayIST, startOfMonthIST, startOfYearIST, now } = getISTDayBounds();

        const [
            activeMembers,
            todaysRevenue,
            monthlyRevenue,
            yearlyRevenue,
            entriesToday,
            todaysMemberEntries,
            todaysEntertainmentEntries
        ] = await Promise.all([
            // Active = not deleted AND expiryDate is in the future
            Member.countDocuments({
                ...baseMatch,
                isDeleted: false,
                $or: [
                    { planEndDate: { $gte: now } },
                    { expiryDate: { $gte: now } },
                ]
            }),
            // Today's revenue — payments created today (IST bounds)
            Payment.aggregate([
                { $match: { ...baseMatch, status: "success", createdAt: { $gte: startOfDayIST, $lte: endOfDayIST } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            // Monthly revenue — payments created this month (IST)
            Payment.aggregate([
                { $match: { ...baseMatch, status: "success", createdAt: { $gte: startOfMonthIST } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            // Yearly revenue — payments created this year (IST)
            Payment.aggregate([
                { $match: { ...baseMatch, status: "success", createdAt: { $gte: startOfYearIST } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            // Today's entries — scans within IST day bounds
            EntryLog.aggregate([
                { $match: { ...baseMatch, scanTime: { $gte: startOfDayIST, $lte: endOfDayIST }, status: "granted" } },
                { $group: { _id: null, total: { $sum: { $ifNull: ["$numPersons", 1] } } } }
            ]),
            // Today's regular member registrations
            Member.countDocuments({
                ...baseMatch,
                isDeleted: false,
                createdAt: { $gte: startOfDayIST, $lte: endOfDayIST }
            }),
            // Today's entertainment member registrations
            EntertainmentMember.countDocuments({
                ...baseMatch,
                isDeleted: false,
                createdAt: { $gte: startOfDayIST, $lte: endOfDayIST }
            })
        ]);

        return {
            activeMembers,
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
        const baseMatch = poolId && poolId !== "superadmin" ? { poolId } : {};
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
        const baseMatch = poolId && poolId !== "superadmin" ? { poolId } : {};
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
    async (poolId: string) => {
        await dbConnect();
        const baseMatch = poolId && poolId !== "superadmin" ? { poolId } : {};
        const { startOfDayIST, endOfDayIST, now } = getISTDayBounds();

        const [totalMembers, activeMembers, todaysEntries, todaysMemberEntries, todaysEntertainmentEntries] = await Promise.all([
            Member.countDocuments({ ...baseMatch, isDeleted: false }),
            // Active = not deleted AND expiry is in the future (real-time, not legacy status)
            Member.countDocuments({
                ...baseMatch,
                isDeleted: false,
                $or: [
                    { planEndDate: { $gte: now } },
                    { expiryDate: { $gte: now } },
                ]
            }),
            EntryLog.aggregate([
                { $match: { ...baseMatch, scanTime: { $gte: startOfDayIST, $lte: endOfDayIST }, status: "granted" } },
                { $group: { _id: null, total: { $sum: { $ifNull: ["$numPersons", 1] } } } }
            ]),
            // Today's regular member registrations
            Member.countDocuments({
                ...baseMatch,
                isDeleted: false,
                createdAt: { $gte: startOfDayIST, $lte: endOfDayIST }
            }),
            // Today's entertainment member registrations
            EntertainmentMember.countDocuments({
                ...baseMatch,
                isDeleted: false,
                createdAt: { $gte: startOfDayIST, $lte: endOfDayIST }
            })
        ]);

        return {
            totalMembers,
            activeMembers,
            todaysEntries: todaysEntries[0]?.total || 0,
            todaysMemberEntries,
            todaysEntertainmentEntries,
        };
    },
    ["cached-dashboard-counts"],
    { revalidate: 10 }
);
