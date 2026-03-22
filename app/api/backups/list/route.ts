import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listBackups } from "@/lib/s3";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const poolFolder = session.user.role === "superadmin" ? "superadmin" : session.user.poolId;
        if (!poolFolder) {
             return NextResponse.json({ error: "No pool assigned" }, { status: 400 });
        }
        
        const backups = await listBackups(poolFolder);
        return NextResponse.json({ backups });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to list backups" }, { status: 500 });
    }
}
