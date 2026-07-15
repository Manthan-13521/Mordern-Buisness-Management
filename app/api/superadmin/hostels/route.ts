import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";

import { Hostel } from "@/models/Hostel";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

// GET /api/superadmin/hostels — list all hostel tenants
export async function GET(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "GET";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            const [user] = await Promise.all([resolveUser(req), dbConnect()]);
            if (!user || user.role !== "superadmin") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const url = new URL(req.url);
            const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
            const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20"));
            const skip = (page - 1) * limit;
            const search = url.searchParams.get("search") || "";

            const query: Record<string, unknown> = {};
            if (search) query.hostelName = { $regex: search, $options: "i" };

            const [hostels, total] = await Promise.all([
                Hostel.find(query)
                    .select("hostelId hostelName slug city adminEmail adminPhone numberOfBlocks status plan subscriptionStatus isTwilioConnected createdAt memberCounter")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Hostel.countDocuments(query),
            ]);

            return NextResponse.json({ data: hostels, total, page, limit, totalPages: Math.ceil(total / limit) });
        } catch (error) {
            console.error("[GET /api/superadmin/hostels]", error);
            return NextResponse.json({ error: "Server error" }, { status: 500 });
        }
        });
            
}
