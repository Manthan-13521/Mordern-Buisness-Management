import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Settings, getSettings } from "@/models/Settings";
import { Pool } from "@/models/Pool";
import { PoolSession } from "@/models/PoolSession";

import { SettingsCapacitySchema } from "@/lib/validators";
import { apiError } from "@/lib/apiError";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
    try {
        const [, settings, user] = await Promise.all([
            dbConnect(),
            getSettings(),
            resolveUser(req),
        ]);

        const url = new URL(req.url);
        const poolslug = url.searchParams.get("poolslug");

        let activeCapacity = settings.poolCapacity;
        let pool = null;

        if (poolslug) {
            pool = await Pool.findOne({ slug: poolslug }).select("capacity slug poolName adminEmail plan subscriptionStatus subscriptionEndsAt isTwilioConnected").lean();
        } else if (user?.poolId) {
            pool = await Pool.findOne({ poolId: user.poolId }).select("capacity slug poolName adminEmail plan subscriptionStatus subscriptionEndsAt isTwilioConnected").lean();
        }

        if (pool) {
            activeCapacity = (pool as any).capacity || activeCapacity;
        }

        return NextResponse.json({
            poolCapacity: activeCapacity,
            currentOccupancy: settings.currentOccupancy,
            occupancyDurationMinutes: settings.occupancyDurationMinutes || 60,
            available: Math.max(0, activeCapacity - settings.currentOccupancy),
            lastBackupAt: settings.lastBackupAt,
            // Account Overview data
            pool: pool ? {
                slug: (pool as any).slug,
                poolName: (pool as any).poolName,
                adminEmail: (pool as any).adminEmail,
                plan: (pool as any).plan,
                subscriptionStatus: (pool as any).subscriptionStatus,
                subscriptionEndsAt: (pool as any).subscriptionEndsAt,
                isTwilioConnected: (pool as any).isTwilioConnected,
            } : null
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        return apiError(error);
    }
}

export async function POST(req: Request) {
    try {
        const [, user] = await Promise.all([
            dbConnect(),
            resolveUser(req),
        ]);
        if (!user || !["admin", "superadmin"].includes(user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const body = await req.json();
        const parsed = SettingsCapacitySchema.parse(body);
        const { poolCapacity, currentOccupancy, occupancyDurationMinutes } = parsed;
        const settings = await getSettings();

        const url = new URL(req.url);
        const poolslug = url.searchParams.get("poolslug");

        let activeCapacity = settings.poolCapacity;
        if (typeof poolCapacity === "number" && poolCapacity > 0) {
            let pool = null;
            if (poolslug) {
                pool = await Pool.findOne({ slug: poolslug });
            } else if (user.poolId) {
                pool = await Pool.findOne({ poolId: user.poolId });
            }

            if (pool) {
                pool.capacity = poolCapacity;
                await pool.save();
                activeCapacity = pool.capacity;
            } else {
                settings.poolCapacity = poolCapacity;
                activeCapacity = poolCapacity;
            }
        }

        if (typeof currentOccupancy === "number" && currentOccupancy >= 0) {
            settings.currentOccupancy = currentOccupancy;

            // Resolve poolId for this pool
            let poolId = null;
            if (poolslug) {
                const poolDoc = await Pool.findOne({ slug: poolslug }).select("poolId").lean();
                if (poolDoc) poolId = (poolDoc as any).poolId;
            } else if (user.poolId) {
                poolId = user.poolId;
            }

            if (poolId) {
                // Step 1: Expire ALL active sessions (scans + walk-ins)
                await PoolSession.updateMany(
                    { poolId, status: "active" },
                    { $set: { status: "expired", expiryTime: new Date() } }
                );

                // Step 2: If setting to a number > 0, create exactly N walk-in sessions
                if (currentOccupancy > 0) {
                    const durationMins = settings.occupancyDurationMinutes || 60;
                    const expiryTime = new Date(Date.now() + durationMins * 60 * 1000);

                    const walkInSessions = [];
                    for (let i = 0; i < currentOccupancy; i++) {
                        walkInSessions.push({
                            poolId,
                            memberId: null,
                            numPersons: 1,
                            status: "active",
                            expiryTime,
                            notes: "Manual walk-in entry",
                        });
                    }
                    await PoolSession.insertMany(walkInSessions);
                }
            }
        }
        if (typeof occupancyDurationMinutes === "number" && occupancyDurationMinutes > 0) {
            settings.occupancyDurationMinutes = occupancyDurationMinutes;
        }
        await settings.save();

        return NextResponse.json({
            poolCapacity: activeCapacity,
            currentOccupancy: settings.currentOccupancy,
            occupancyDurationMinutes: settings.occupancyDurationMinutes,
            available: Math.max(0, activeCapacity - settings.currentOccupancy),
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        return apiError(error);
    }
}
