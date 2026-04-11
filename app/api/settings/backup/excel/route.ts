import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { Payment } from "@/models/Payment";
import { Settings } from "@/models/Settings";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireCronAuth } from "@/lib/requireCronAuth";
import { logger } from "@/lib/logger";
import type ExcelJSType from "exceljs";
import { checkBackupExists, uploadBackup } from "@/lib/s3";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    // Allow cron job OR authenticated admin
    let isAuthorized = false;
    let session: Session | null = null;

    const cronErr = requireCronAuth(req);
    if (!cronErr) {
        isAuthorized = true;
    } else {
        const [, s] = await Promise.all([
            dbConnect(),
            getServerSession(authOptions),
        ]);
        session = s;
        if (session?.user && session.user.role === "admin") {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await dbConnect();
        
        // Scope backup to specific user pool (or superadmin)
        const poolFolder = session?.user?.poolId || "superadmin";
        const dateStrDay = new Date().toISOString().split("T")[0].replace(/-/g, "_");
        
        // 1. Prevent Duplicate Backups (Check if a backup exists for the SAME DAY)
        const dayPrefix = `backups/${poolFolder}/backup_${dateStrDay}`;
        if (!force) {
            const alreadyExists = await checkBackupExists(dayPrefix);
            if (alreadyExists) {
                return NextResponse.json({ 
                    message: "Backup already created today.", 
                    exists: true 
                }, { status: 200 }); // Returning 200 so cron jobs don't crash
            }
        }

        const baseMatch = session?.user && session.user.role !== "superadmin" && session.user.poolId 
            ? { poolId: session.user.poolId } : {};

        // 2. Backup Data Restriction: Include ONLY Member details & Payment details.
        const [members, payments] = await Promise.all([
            Member.find({ status: { $ne: "deleted" }, ...baseMatch })
                .populate("planId", "name price")
                .select("memberId name phone age planId startDate expiryDate status entriesUsed totalEntriesAllowed")
                .lean(),
            Payment.find({ ...baseMatch })
                .populate("memberId", "name memberId")
                .populate("planId", "name")
                .select("memberId amount paymentMethod transactionId razorpayOrderId status date")
                .lean(),
        ]);

        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "TS Pools System (S3 Optimized)";
        workbook.created = new Date();

        // ── Members Sheet ──────────────────────────────────────────────────────
        const membersSheet = workbook.addWorksheet("Members");
        membersSheet.columns = [
            { header: "Member ID", key: "memberId", width: 12 },
            { header: "Name", key: "name", width: 25 },
            { header: "Phone", key: "phone", width: 15 },
            { header: "Age", key: "age", width: 8 },
            { header: "Plan", key: "plan", width: 20 },
            { header: "Start Date", key: "startDate", width: 18 },
            { header: "Expiry Date", key: "expiryDate", width: 18 },
            { header: "Status", key: "status", width: 12 },
            { header: "Entries Used", key: "entriesUsed", width: 14 },
            { header: "Total Entries", key: "totalEntriesAllowed", width: 14 },
        ];
        membersSheet.getRow(1).font = { bold: true };
        membersSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };

        members.forEach((m: any) => {
            membersSheet.addRow({
                memberId: m.memberId,
                name: m.name,
                phone: m.phone,
                age: m.age,
                plan: (m.planId as any)?.name || "N/A",
                startDate: m.startDate ? new Date(m.startDate).toLocaleDateString("en-IN") : "",
                expiryDate: m.expiryDate ? new Date(m.expiryDate).toLocaleDateString("en-IN") : "",
                status: m.status,
                entriesUsed: m.entriesUsed,
                totalEntriesAllowed: m.totalEntriesAllowed,
            });
        });

        // ── Payments Sheet ─────────────────────────────────────────────────────
        const paymentsSheet = workbook.addWorksheet("Payments");
        paymentsSheet.columns = [
            { header: "Member ID", key: "memberId", width: 12 },
            { header: "Member Name", key: "memberName", width: 25 },
            { header: "Plan", key: "plan", width: 20 },
            { header: "Amount (₹)", key: "amount", width: 12 },
            { header: "Method", key: "method", width: 18 },
            { header: "Transaction ID", key: "transactionId", width: 30 },
            { header: "Status", key: "status", width: 12 },
            { header: "Date", key: "date", width: 20 },
        ];
        paymentsSheet.getRow(1).font = { bold: true };

        payments.forEach((p: any) => {
            paymentsSheet.addRow({
                memberId: (p.memberId as any)?.memberId || "",
                memberName: (p.memberId as any)?.name || "",
                plan: (p.planId as any)?.name || "",
                amount: p.amount,
                method: p.paymentMethod,
                transactionId: p.transactionId || p.razorpayOrderId || "",
                status: p.status,
                date: p.date ? new Date(p.date).toLocaleString("en-IN") : "",
            });
        });

        // Update lastBackupAt in settings
        await Settings.updateOne({}, { $set: { lastBackupAt: new Date() } });
        
        const buffer = await workbook.xlsx.writeBuffer();

        // 3. File Naming Upgrade: Include hour and minute to prevent daily overwrites
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const filename = `backup_${dateStrDay}_${hh}_${mm}.xlsx`;

        // Module-based S3 Upload logic has been extracted to dedicated AWS export buttons.
        // Return local file directly.

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
        });
    } catch (error) {
        logger.error("Excel backup failed", { error: String(error) });
        return NextResponse.json({ error: "Failed to generate Excel backup" }, { status: 500 });
    }
}
