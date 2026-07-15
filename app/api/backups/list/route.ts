import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { listBackups } from "@/lib/s3";
import { requestContext } from "@/lib/requestContext";

export const dynamic = 'force-dynamic';

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
            const user = await resolveUser(req);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
    try {
            const poolFolder = user.role === "superadmin" ? "superadmin" : user.poolId;
            if (!poolFolder) {
                 return NextResponse.json({ error: "No pool assigned" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
            
            const backups = await listBackups(poolFolder);
            return NextResponse.json({ backups }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        } catch (error: any) {
            return NextResponse.json({ error: error.message || "Failed to list backups" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        });
            
}
