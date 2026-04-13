import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { Payment } from "@/models/Payment";
import { Plan } from "@/models/Plan";
import { EntryLog } from "@/models/EntryLog";
import { DeletedMember } from "@/models/DeletedMember";

import { uploadBackup } from "@/lib/s3";
import { gzipSync } from "zlib";

export async function POST(req: Request) {
    try {
        await dbConnect();
        const user = await resolveUser(req);

        if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const poolId = user.poolId;
        if (!poolId && user.role !== "superadmin") {
            return NextResponse.json({ error: "No pool ID found for user" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const baseMatch = poolId ? { poolId } : {};

        // 1. Calculate 365 Days Cutoff
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        // 2. Fetch Active, Expired, and Soft-Deleted Members (from original collection)
        const members = await Member.find({
            ...baseMatch,
            $or: [
                { startDate: { $gte: oneYearAgo } },
                { planStartDate: { $gte: oneYearAgo } },
                { expiredAt: { $gte: oneYearAgo } },
                { deletedAt: { $gte: oneYearAgo } },
                { createdAt: { $gte: oneYearAgo } }
            ]
        }).lean();

        // 3. Fetch Hard-Deleted Members (from archive collection)
        const deletedMembers = await DeletedMember.find({
            ...baseMatch,
            deletedAt: { $gte: oneYearAgo }
        }).lean();

        // deduplicate if same member exists in both (rare, but possible if recently deleted)
        const memberIdsMap = new Set();
        const uniqueMembers = [];
        for (const m of members) {
            memberIdsMap.add((m as any).memberId);
            uniqueMembers.push(m);
        }
        for (const m of deletedMembers) {
            const mId = (m as any).memberId;
            if (!memberIdsMap.has(mId)) {
                uniqueMembers.push((m as any).fullData || m);
            }
        }

        // Fetch remaining associated data
        const [payments, entries, plans] = await Promise.all([
            Payment.find({ ...baseMatch, date: { $gte: oneYearAgo } }).lean(),
            EntryLog.find({ ...baseMatch, scanTime: { $gte: oneYearAgo } }).lean(),
            Plan.find({ ...baseMatch }).lean(),
        ]);

        const backupData = {
            backupType: "last-1-year",
            module: "pool",
            tenantId: poolId || "superadmin",
            generatedAt: new Date().toISOString(),
            data: {
                members: uniqueMembers,
                payments,
                entries,
                plans
            }
        };

        const jsonString = JSON.stringify(backupData);
        const compressedBuffer = gzipSync(Buffer.from(jsonString, "utf-8"));

        const dateStrDay = new Date().toISOString().split("T")[0];
        const s3Key = `backups/${poolId || "superadmin"}/pool-backup-last-1-year-${dateStrDay}.json.gz`;

        await uploadBackup(compressedBuffer, s3Key, "application/gzip");

        return NextResponse.json({ success: true, key: s3Key }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[POST /api/settings/aws/backup-json]", error);
        return NextResponse.json({ error: error?.message || "Backup failed" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
