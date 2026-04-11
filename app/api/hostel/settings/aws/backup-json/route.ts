import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelPayment } from "@/models/HostelPayment";
import { HostelAnalytics } from "@/models/HostelAnalytics";
import { HostelRoom } from "@/models/HostelRoom";
import { HostelFloor } from "@/models/HostelFloor";
import { HostelBlock } from "@/models/HostelBlock";
import { HostelPlan } from "@/models/HostelPlan";
import { DeletedHostelMember } from "@/models/DeletedHostelMember";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadBackup } from "@/lib/s3";
import { gzipSync } from "zlib";

export async function POST(req: Request) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);

        if (!session?.user || (session.user.role !== "admin" && session.user.role !== "superadmin" && session.user.role !== "hostel_admin")) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const hostelId = (session.user as any).hostelId || (session.user as any).poolId;
        if (!hostelId) {
            return NextResponse.json({ error: "No tenant ID found for user" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        const last12Months: string[] = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            last12Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        }

        const members = await HostelMember.find({
            hostelId,
            $or: [
                { join_date: { $gte: oneYearAgo } },
                { vacated_at: { $gte: oneYearAgo } },
                { deletedAt: { $gte: oneYearAgo } },
                { createdAt: { $gte: oneYearAgo } }
            ]
        }).lean();

        const deletedMembers = await DeletedHostelMember.find({
            hostelId,
            deletedAt: { $gte: oneYearAgo }
        }).lean();

        // deduplicate
        const memberIdsMap = new Set();
        const uniqueMembers = [];
        for (const m of members) {
            memberIdsMap.add((m as any).memberId);
            uniqueMembers.push(m);
        }
        for (const m of deletedMembers) {
            const mData = (m as any).originalDoc || m;
            if (!memberIdsMap.has(mData.memberId || (m as any).memberId)) {
                uniqueMembers.push(mData);
            }
        }

        const [
            payments,
            analytics,
            rooms,
            floors,
            blocks,
            plans
        ] = await Promise.all([
            HostelPayment.find({ hostelId, payment_date: { $gte: oneYearAgo } }).lean(),
            HostelAnalytics.find({ hostelId, yearMonth: { $in: last12Months } }).lean(),
            HostelRoom.find({ hostelId }).lean(),
            HostelFloor.find({ hostelId }).lean(),
            HostelBlock.find({ hostelId }).lean(),
            HostelPlan.find({ hostelId }).lean(),
        ]);

        const backupData = {
            backupType: "last-1-year",
            module: "hostel",
            tenantId: hostelId,
            generatedAt: new Date().toISOString(),
            data: {
                members: uniqueMembers,
                payments,
                analytics,
                rooms,
                floors,
                blocks,
                plans,
            }
        };

        const jsonString = JSON.stringify(backupData);
        const compressedBuffer = gzipSync(Buffer.from(jsonString, "utf-8"));

        const dateStrDay = new Date().toISOString().split("T")[0];
        const s3Key = `backups/${hostelId}/hostel-backup-last-1-year-${dateStrDay}.json.gz`;

        await uploadBackup(compressedBuffer, s3Key, "application/gzip");

        return NextResponse.json({ success: true, key: s3Key }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

    } catch (error: any) {
        console.error("[POST /api/hostel/settings/aws/backup-json]", error);
        return NextResponse.json({ error: error?.message || "Backup failed" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
