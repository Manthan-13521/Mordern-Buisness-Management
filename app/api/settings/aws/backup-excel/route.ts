import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { Payment } from "@/models/Payment";
import { DeletedMember } from "@/models/DeletedMember";

import { uploadBackup } from "@/lib/s3";
import type ExcelJSType from "exceljs";

export async function POST(req: Request) {
    try {
        await dbConnect();
        const user = await resolveUser(req);

        if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const poolId = user.poolId;
        const baseMatch = poolId ? { poolId } : {};

        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        // Fetch Members
        const members = await Member.find({
            ...baseMatch,
            $or: [
                { startDate: { $gte: oneYearAgo } },
                { planStartDate: { $gte: oneYearAgo } },
                { expiredAt: { $gte: oneYearAgo } },
                { deletedAt: { $gte: oneYearAgo } },
                { createdAt: { $gte: oneYearAgo } }
            ]
        }).populate("planId", "name price").lean();

        // Fetch Archived Members
        const deletedMembers = await DeletedMember.find({
            ...baseMatch,
            deletedAt: { $gte: oneYearAgo }
        }).lean();

        // Deduplication
        const memberIdsMap = new Set();
        const uniqueMembers = [];
        for (const m of members) {
            memberIdsMap.add((m as any).memberId);
            uniqueMembers.push(m);
        }
        for (const m of deletedMembers) {
            const mData = (m as any).fullData || m;
            if (!memberIdsMap.has(mData.memberId || (m as any).memberId)) {
                uniqueMembers.push(mData);
            }
        }

        // Fetch Payments
        const payments = await Payment.find({ ...baseMatch, date: { $gte: oneYearAgo } })
            .populate("memberId", "name memberId")
            .populate("planId", "name")
            .lean();

        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "TS Pools System";
        workbook.created = new Date();

        // ── Metadata Sheet ──────────────────────────────────────────────────
        const metaSheet = workbook.addWorksheet("Backup Metadata");
        metaSheet.columns = [{ header: "Key", key: "k", width: 20 }, { header: "Value", key: "v", width: 40 }];
        metaSheet.addRow({ k: "backupType", v: "last-1-year" });
        metaSheet.addRow({ k: "module", v: "pool" });
        metaSheet.addRow({ k: "tenantId", v: poolId || "superadmin" });
        metaSheet.addRow({ k: "generatedAt", v: new Date().toISOString() });

        // ── Members Sheet ──────────────────────────────────────────────────────
        const membersSheet = workbook.addWorksheet("Members");
        membersSheet.columns = [
            { header: "Member ID", key: "memberId", width: 12 },
            { header: "Name", key: "name", width: 25 },
            { header: "Phone", key: "phone", width: 15 },
            { header: "Plan", key: "plan", width: 20 },
            { header: "Start Date", key: "startDate", width: 18 },
            { header: "Expiry Date", key: "expiryDate", width: 18 },
            { header: "Status", key: "status", width: 12 },
        ];
        membersSheet.getRow(1).font = { bold: true };

        uniqueMembers.forEach((m: any) => {
            membersSheet.addRow({
                memberId: m.memberId,
                name: m.name,
                phone: m.phone,
                plan: (m.planId as any)?.name || "N/A",
                startDate: (m.startDate || m.planStartDate) ? new Date(m.startDate || m.planStartDate).toLocaleDateString("en-IN") : "",
                expiryDate: (m.expiryDate || m.planEndDate) ? new Date(m.expiryDate || m.planEndDate).toLocaleDateString("en-IN") : "",
                status: m.status,
            });
        });

        // ── Payments Sheet ─────────────────────────────────────────────────────
        const paymentsSheet = workbook.addWorksheet("Payments");
        paymentsSheet.columns = [
            { header: "Member ID", key: "memberId", width: 12 },
            { header: "Member Name", key: "memberName", width: 25 },
            { header: "Plan", key: "plan", width: 20 },
            { header: "Amount (₹)", key: "amount", width: 12 },
            { header: "Date", key: "date", width: 20 },
            { header: "Transaction ID", key: "transactionId", width: 25 },
        ];
        paymentsSheet.getRow(1).font = { bold: true };

        payments.forEach((p: any) => {
            paymentsSheet.addRow({
                memberId: (p.memberId as any)?.memberId || "",
                memberName: (p.memberId as any)?.name || "",
                plan: (p.planId as any)?.name || "",
                amount: p.amount,
                date: p.date ? new Date(p.date).toLocaleString("en-IN") : "",
                transactionId: p.transactionId || "",
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        
        const dateStrDay = new Date().toISOString().split("T")[0];
        const s3Key = `backups/${poolId || "superadmin"}/pool-backup-last-1-year-${dateStrDay}.xlsx`;

        await uploadBackup(
            Buffer.from(buffer), 
            s3Key, 
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        return NextResponse.json({ success: true, key: s3Key }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[POST /api/settings/aws/backup-excel]", error);
        return NextResponse.json({ error: error?.message || "Backup failed" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
