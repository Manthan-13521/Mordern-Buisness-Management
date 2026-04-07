import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelPayment } from "@/models/HostelPayment";
import { DeletedHostelMember } from "@/models/DeletedHostelMember";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadBackup } from "@/lib/s3";

export async function POST(req: Request) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);

        if (!session?.user || (session.user.role !== "admin" && session.user.role !== "superadmin" && session.user.role !== "hostel_admin")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const hostelId = (session.user as any).hostelId || (session.user as any).poolId;
        if (!hostelId) {
            return NextResponse.json({ error: "No tenant ID found for user" }, { status: 400 });
        }

        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        const members = await HostelMember.find({
            hostelId,
            $or: [
                { join_date: { $gte: oneYearAgo } },
                { vacated_at: { $gte: oneYearAgo } },
                { deletedAt: { $gte: oneYearAgo } },
                { createdAt: { $gte: oneYearAgo } }
            ]
        }).populate("planId", "name").populate("roomId", "roomNo").populate("blockId", "name").populate("floorId", "floorNo").lean();

        const deletedMembers = await DeletedHostelMember.find({
            hostelId,
            deletedAt: { $gte: oneYearAgo }
        }).lean();

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

        const payments = await HostelPayment.find({ hostelId, payment_date: { $gte: oneYearAgo } })
            .populate("memberId", "name memberId")
            .populate("planId", "name")
            .lean();

        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "TS Hostel System AWS";
        workbook.created = new Date();

        // ── Metadata Sheet ──────────────────────────────────────────────────
        const metaSheet = workbook.addWorksheet("Backup Metadata");
        metaSheet.columns = [{ header: "Key", key: "k", width: 20 }, { header: "Value", key: "v", width: 40 }];
        metaSheet.addRow({ k: "backupType", v: "last-1-year" });
        metaSheet.addRow({ k: "module", v: "hostel" });
        metaSheet.addRow({ k: "tenantId", v: hostelId });
        metaSheet.addRow({ k: "generatedAt", v: new Date().toISOString() });

        // ── Members Sheet ──────────────────────────────────────────────────────
        const membersSheet = workbook.addWorksheet("Members");
        membersSheet.columns = [
            { header: "Member ID", key: "memberId", width: 12 },
            { header: "Name", key: "name", width: 25 },
            { header: "Phone", key: "phone", width: 15 },
            { header: "Plan", key: "plan", width: 20 },
            { header: "Room", key: "room", width: 15 },
            { header: "Balance", key: "balance", width: 12 },
            { header: "Status", key: "status", width: 12 },
        ];
        membersSheet.getRow(1).font = { bold: true };

        uniqueMembers.forEach((m: any) => {
            let loc = m.roomId?.roomNo ? `${m.roomId?.roomNo}` : "N/A";
            if (m.blockId?.name) loc = `${m.blockId?.name}-${loc}`;
            membersSheet.addRow({
                memberId: m.memberId,
                name: m.name,
                phone: m.phone,
                plan: (m.planId as any)?.name || "N/A",
                room: loc,
                balance: m.balance || 0,
                status: m.status,
            });
        });

        // ── Payments Sheet ─────────────────────────────────────────────────────
        const paymentsSheet = workbook.addWorksheet("Payments");
        paymentsSheet.columns = [
            { header: "Member ID", key: "memberId", width: 12 },
            { header: "Member Name", key: "memberName", width: 25 },
            { header: "Amount (₹)", key: "amount", width: 12 },
            { header: "Method", key: "method", width: 18 },
            { header: "Status", key: "status", width: 12 },
            { header: "Date", key: "date", width: 20 },
        ];
        paymentsSheet.getRow(1).font = { bold: true };

        payments.forEach((p: any) => {
            paymentsSheet.addRow({
                memberId: (p.memberId as any)?.memberId || "",
                memberName: (p.memberId as any)?.name || "",
                amount: p.amount,
                method: p.paymentMethod,
                status: p.status,
                date: p.payment_date ? new Date(p.payment_date).toLocaleString("en-IN") : new Date(p.createdAt || new Date()).toLocaleString("en-IN"),
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        
        const dateStrDay = new Date().toISOString().split("T")[0];
        const s3Key = `backups/${hostelId}/hostel-backup-last-1-year-${dateStrDay}.xlsx`;

        await uploadBackup(
            Buffer.from(buffer), 
            s3Key, 
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        const { HostelSettings } = await import("@/models/HostelSettings");
        await HostelSettings.updateOne(
            { hostelId },
            { $set: { lastBackupAt: new Date() } },
            { upsert: true }
        );

        return NextResponse.json({ success: true, key: s3Key }, { status: 200 });
    } catch (error: any) {
        console.error("[POST /api/hostel/settings/aws/backup-excel]", error);
        return NextResponse.json({ error: error?.message || "Backup failed" }, { status: 500 });
    }
}
