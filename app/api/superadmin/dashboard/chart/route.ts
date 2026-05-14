import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { SystemStats } from "@/models/SystemStats";

export const dynamic = "force-dynamic";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (user.role !== "superadmin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await dbConnect();

        // Fetch last 12 months
        // Since month is string YYYY-MM, sorting chronologically works
        const stats = await SystemStats.find({}).sort({ month: -1 }).limit(12).lean();

        // Reverse to get chronological order (oldest -> newest)
        stats.reverse();

        // Format to what frontend expects: { month: "Jan", pool: 10, hostel: 5, business: 3, active: 12 }
        const formatted = stats.map(s => {
            const [year, monthStr] = s.month.split('-');
            const monthIdx = parseInt(monthStr, 10) - 1;
            return {
                month: `${MONTH_NAMES[monthIdx]}`, 
                pool: s.poolUsers || 0,
                hostel: s.hostelUsers || 0,
                business: s.businessUsers || 0,
                active: s.activeUsers || 0,
                referrals: s.referralUses || 0
            };
        });

        // Ensure at least some data exists to not crash graph if totally empty DB
        if (formatted.length === 0) {
            const tempMonth = new Date();
            formatted.push({
                month: MONTH_NAMES[tempMonth.getMonth()],
                pool: 0, hostel: 0, business: 0, active: 0
            });
        }

        return NextResponse.json(formatted, {
            headers: { "Cache-Control": "private, max-age=60, must-revalidate" }
        });
    } catch (e) {
        console.error("[SystemStats API]", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
