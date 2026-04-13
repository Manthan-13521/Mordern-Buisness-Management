import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Hostel } from "@/models/Hostel";
import { Pool } from "@/models/Pool";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Compute status dynamically: trust the clock if expiry exists, 
 * otherwise fallback to the stored status.
 */
function computeStatus(expiryDate?: Date, storedStatus?: string): "active" | "expired" | "none" {
    if (expiryDate) {
        return new Date() > new Date(expiryDate) ? "expired" : "active";
    }
    if (storedStatus === "active" || storedStatus === "trial") return "active";
    return "none";
}

/**
 * GET /api/subscription/status
 * Returns the current user's subscription details with live status computation.
 * Now accounts for tenant-level (Hostel/Pool) subscriptions if User-level is missing.
 */
export async function GET(req: Request) {
    try {
        const user = await resolveUser(req) as any;
        if (!user.id) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Superadmin bypass
        if (user.role === "superadmin") {
            return NextResponse.json({
                status:     "active",
                planType:   "superadmin",
                module:     null,
                expiryDate: null,
                daysLeft:   null,
                trialUsed:  false,
            }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        await dbConnect();
        const user = await User.findById(user.id)
            .select("subscription trial role hostelId poolId")
            .lean() as any;

        if (!user) return NextResponse.json({ error: "User not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        let sub = user.idscription;

        // Fallback to tenant model if user record lacks subscription data
        if (!sub) {
            if (user.role === "hostel_admin" && user.hostelId) {
                const hostel = await Hostel.findOne({ hostelId: user.hostelId })
                    .select("plan subscriptionStatus subscriptionEndsAt")
                    .lean() as any;
                if (hostel) {
                    sub = {
                        planType:   hostel.plan,
                        status:     hostel.subscriptionStatus, // will be recomputed as liveStatus
                        expiryDate: hostel.subscriptionEndsAt,
                    };
                }
            } else if (user.role === "admin" && user.poolId) {
                const pool = await Pool.findOne({ poolId: user.poolId })
                    .select("plan subscriptionStatus subscriptionEndsAt")
                    .lean() as any;
                if (pool) {
                    sub = {
                        planType:   pool.plan,
                        status:     pool.subscriptionStatus,
                        expiryDate: pool.subscriptionEndsAt,
                    };
                }
            }
        }

        const liveStatus = computeStatus(sub?.expiryDate, sub?.status);

        const daysLeft = sub?.expiryDate
            ? Math.ceil((new Date(sub.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : (sub && !sub.expiryDate ? 999 : null); // Handle "never expires" or trial without end date if any

        return NextResponse.json({
            status:     liveStatus,          // "active" | "expired" | "none"
            planType:   sub?.planType || sub?.plan || null,
            module:     sub?.module || (user.role === "hostel_admin" ? "hostel" : user.role === "admin" ? "pool" : null),
            blocks:     sub?.blocks || null,
            pricePaid:  sub?.pricePaid || null,
            startDate:  sub?.startDate || null,
            expiryDate: sub?.expiryDate || null,
            daysLeft:   liveStatus === "none" ? null : daysLeft,
            trialUsed:  user.trial?.isUsed || false,
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[GET /api/subscription/status]", error);
        return NextResponse.json({ error: "Failed to fetch subscription status" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
