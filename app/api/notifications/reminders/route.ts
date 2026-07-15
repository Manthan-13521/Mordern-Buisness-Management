import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { withHealthcheck } from "@/lib/healthchecks";

import { dispatchJob } from "@/lib/queueAdapter";
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
            const authHeader = req.headers.get("authorization");
    let isAuthorized = false;
    let user: AuthUser | null = null;
    let poolId: string | undefined;
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
            isAuthorized = true;
        } else {
            await dbConnect();
            user = await resolveUser(req);
            if (user && user.role === "admin") {
                isAuthorized = true;
                poolId = user.poolId;
            }
        }
    if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
    return withHealthcheck({ checkName: "notifications-reminders", timeoutMs: 55000 }, async () => {
            try {
                const result = await dispatchJob("SEND_REMINDER", { poolId });

                return NextResponse.json({
                    message: "Reminders processed",
                    ...result as any,
                }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            } catch (error) {
                console.error(error);
                return NextResponse.json({ error: "Failed to process reminders" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        });
        });
            
}

