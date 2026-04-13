import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { listBackups } from "@/lib/s3";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
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
}
