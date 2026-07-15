import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

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
            const user = await resolveUser(req);
            if (!user || user.role !== "superadmin") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            await dbConnect();
            const pools = await Pool.find().lean();
            
            return NextResponse.json(pools);
        } catch (error) {
            return NextResponse.json({ error: "Failed to fetch pools" }, { status: 500 });
        }
        });
            
}
