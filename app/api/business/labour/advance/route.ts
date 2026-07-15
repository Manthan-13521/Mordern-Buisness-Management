import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessLabourAdvance } from "@/models/BusinessLabourAdvance";
import { requireBusinessId } from "@/lib/tenant";
import { financialWriteLimiter } from "@/lib/rateLimiter";
import { auditLog } from "@/lib/auditLog";
import { logger } from "@/lib/logger";
import { requestContext } from "@/lib/requestContext";

export async function POST(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "POST";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
        const user = await resolveUser(req);
        if (!user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let businessId: string;
        try {
          businessId = requireBusinessId(user);
        } catch (err: any) {
          return NextResponse.json(
            { error: err.message },
            { status: err.message === "Unauthorized" ? 401 : 403 }
          );
        }

        // 🟠 RATE LIMITING
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const rl = financialWriteLimiter.checkTenant(user.businessId || "unknown", ip);
        if (!rl.allowed) {
          return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
        }

        const { staffId, month, amount } = await req.json();

        if (!staffId || !month || typeof amount !== "number") {
          return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await dbConnect();

        const advance = await BusinessLabourAdvance.findOneAndUpdate(
          { labourId: staffId, month, businessId },
          { $set: { amount } },
          { upsert: true, new: true }
        );

        auditLog.financial({ businessId, userId: user.id, action: "LABOUR_ADVANCE", details: { staffId, month, amount } });

        return NextResponse.json({ success: true, data: advance });
      } catch (error: any) {
        logger.error("Advance API error", { error: error?.message });
        return NextResponse.json(
          { error: "Failed to update advance", details: error.message },
          { status: 500 }
        );
      }
        });
            
}
