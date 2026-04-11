import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelPayment } from "@/models/HostelPayment";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
    let isAuthorized = false;
    let session: Session | null = null;

    try {
        await dbConnect();
        session = await getServerSession(authOptions);
        if (session?.user && (session.user.role === "admin" || session.user.role === "superadmin" || session.user.role === "hostel_admin")) {
            isAuthorized = true;
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const hostelId = (session?.user as any)?.hostelId || (session?.user as any)?.poolId;
        const baseMatch = hostelId ? { hostelId } : {};

        const [members, payments] = await Promise.all([
            HostelMember.find({ status: { $ne: "deleted" }, ...baseMatch })
                .populate("planId", "name")
                .populate("roomId", "roomNo")
                .populate("blockId", "name")
                .populate("floorId", "floorNo")
                .lean(),
            HostelPayment.find({ ...baseMatch })
                .populate("memberId", "name memberId")
                .populate("planId", "name")
                .lean(),
        ]);

        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "TS Hostel System";
        workbook.created = new Date();

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

        members.forEach((m: any) => {
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
        const filename = `hostel_backup_${dateStrDay}.xlsx`;

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
        });
    } catch (error) {
        console.error("Excel backup failed", error);
        return NextResponse.json({ error: "Failed to generate Excel backup" }, { status: 500 });
    }
}
