import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { WaterQualityLog } from "@/models/WaterQualityLog";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

/**
 * Derive water quality status from readings:
 * pH 7.2–7.8 and chlorine 1–3 ppm = safe. Outside = warning/critical.
 */
function deriveStatus(ph: number, chlorine: number): "safe" | "warning" | "critical" {
    const phOk      = ph >= 7.0 && ph <= 7.8;
    const chlorOk   = chlorine >= 1.0 && chlorine <= 3.0;
    const phCritical    = ph < 6.5 || ph > 8.5;
    const chlorCritical = chlorine < 0.5 || chlorine > 5.0;

    if (phCritical || chlorCritical) return "critical";
    if (!phOk || !chlorOk) return "warning";
    return "safe";
}

/**
 * GET /api/water-quality
 * Paginated water quality readings for the pool.
 * ?days=7 (default 7-day window), page, limit
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const page    = Math.max(1, Number(searchParams.get("page")  ?? 1));
        const limit   = Math.min(100, Number(searchParams.get("limit") ?? 20));
        const days    = Number(searchParams.get("days") ?? 7);
        const poolId  = session.user.role === "superadmin"
            ? (searchParams.get("poolId") ?? session.user.poolId)
            : session.user.poolId;

        const since = new Date();
        since.setDate(since.getDate() - days);

        await dbConnect();

        const filter = { poolId, recordedAt: { $gte: since } };

        const [data, total, latestReading] = await Promise.all([
            WaterQualityLog.find(filter)
                .sort({ recordedAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            WaterQualityLog.countDocuments(filter),
            WaterQualityLog.findOne({ poolId }).sort({ recordedAt: -1 }).lean(),
        ]);

        return NextResponse.json({ data, total, page, limit, latestReading });
    } catch (error) {
        console.error("[GET /api/water-quality]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/water-quality
 * Record a new water quality reading.
 * Body: { ph, chlorine, temperature, turbidity?, alkalinity?, hardness?, notes? }
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { ph, chlorine, temperature, turbidity, alkalinity, hardness, notes } = body;

        if (ph === undefined || chlorine === undefined || temperature === undefined) {
            return NextResponse.json({ error: "ph, chlorine, and temperature are required" }, { status: 400 });
        }

        const phNum    = Number(ph);
        const chlorNum = Number(chlorine);
        const tempNum  = Number(temperature);

        if (isNaN(phNum) || phNum < 0 || phNum > 14) return NextResponse.json({ error: "pH must be 0–14" }, { status: 400 });
        if (isNaN(chlorNum) || chlorNum < 0)         return NextResponse.json({ error: "chlorine must be ≥ 0" }, { status: 400 });
        if (isNaN(tempNum))                           return NextResponse.json({ error: "invalid temperature" }, { status: 400 });

        const status = deriveStatus(phNum, chlorNum);

        await dbConnect();

        const log = await WaterQualityLog.create({
            poolId:      session.user.poolId,
            recordedBy:  new mongoose.Types.ObjectId(session.user.id),
            ph:          phNum,
            chlorine:    chlorNum,
            temperature: tempNum,
            turbidity:   turbidity !== undefined ? Number(turbidity) : undefined,
            alkalinity:  alkalinity !== undefined ? Number(alkalinity) : undefined,
            hardness:    hardness   !== undefined ? Number(hardness)   : undefined,
            status,
            notes:       notes?.trim() || undefined,
            recordedAt:  new Date(),
        });

        return NextResponse.json(log, { status: 201 });
    } catch (error) {
        console.error("[POST /api/water-quality]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
