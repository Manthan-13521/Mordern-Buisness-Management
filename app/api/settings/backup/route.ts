import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Plan } from "@/models/Plan";
import { Member } from "@/models/Member";
import { Payment } from "@/models/Payment";
import { EntryLog } from "@/models/EntryLog";
import { NotificationLog } from "@/models/NotificationLog";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { requireCronAuth } from "@/lib/requireCronAuth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
    // Allow Cron Jobs with Secret OR Authenticated Admins
    let isAuthorized = false;
    let session: Session | null = null;

    const cronErr = requireCronAuth(req);
    if (!cronErr) {
        isAuthorized = true;
    } else {
        await dbConnect();
        session = await getServerSession(authOptions);
        if (session?.user && session.user.role === "admin") {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }

    try {
        await dbConnect();
        
        // Ensure pool separation for non-superadmins
        const baseMatch = session?.user && session.user.role !== "superadmin" && session.user.poolId 
            ? { poolId: session.user.poolId } : {};

        // Fetch all records from all collections
        const [users, plans, members, payments, entries, notifications] = await Promise.all([
            User.find({ ...baseMatch }).lean(),
            Plan.find({ deletedAt: null, ...baseMatch }).lean(),
            Member.find({ ...baseMatch }).lean(),
            Payment.find({ ...baseMatch }).lean(),
            EntryLog.find({ ...baseMatch }).lean(),
            NotificationLog.find({}).lean(), // Needs complex link or ignore for now
        ]);

        const backupData = {
            timestamp: new Date().toISOString(),
            version: "1.0",
            data: {
                users,
                plans,
                members,
                payments,
                entries,
                notifications,
            },
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const buffer = Buffer.from(jsonString, "utf-8");

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Disposition": `attachment; filename="ts_pools_backup_${new Date().toISOString().split("T")[0]}.json"`,
                "Content-Type": "application/json",
            },
        });

    } catch (error) {
        console.error("Backup failed", error);
        return NextResponse.json({ error: "Failed to generate backup" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
