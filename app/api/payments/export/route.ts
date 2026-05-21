import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { Member } from "@/models/Member";
import { Plan } from "@/models/Plan";
import { User } from "@/models/User";


export const dynamic = "force-dynamic";
export const revalidate = 0;


export async function GET(req: Request) {
    try {
        await dbConnect();

        const user = await resolveUser(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const baseMatch = user.role !== "superadmin" && user.poolId ? { poolId: user.poolId } : {};

        const rawPayments = await Payment.find({ ...baseMatch })
            .populate("recordedBy", "name")
            .sort({ date: -1 })
            .lean() as any[];

        const memberIds = rawPayments.map(p => p.memberId).filter(Boolean);
        const planIds = rawPayments.map(p => p.planId).filter(Boolean);

        const [members, entMembers, plans] = await Promise.all([
            Member.find({ _id: { $in: memberIds } }).select("name memberId").lean(),
            import("@/models/EntertainmentMember").then(m => m.EntertainmentMember.find({ _id: { $in: memberIds } }).select("name memberId").lean()),
            import("@/models/Plan").then(m => m.Plan.find({ _id: { $in: planIds } }).select("name price").lean()),
        ]);

        const memberMap = new Map();
        members.forEach((m: any) => memberMap.set(m._id.toString(), m));
        entMembers.forEach((m: any) => memberMap.set(m._id.toString(), m));

        const planMap = new Map();
        plans.forEach((p: any) => planMap.set(p._id.toString(), p));

        const payments = rawPayments.map(p => ({
            ...p,
            memberId: memberMap.get(p.memberId?.toString()) || { name: "N/A", memberId: "Unknown" },
            planId: planMap.get(p.planId?.toString()) || { name: "N/A" }
        }));

        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Payments");

        worksheet.columns = [
            { header: "Date", key: "date", width: 20 },
            { header: "Member ID", key: "memberId", width: 15 },
            { header: "Member Name", key: "memberName", width: 25 },
            { header: "Plan", key: "plan", width: 20 },
            { header: "Amount (₹)", key: "amount", width: 15 },
            { header: "Method", key: "method", width: 15 },
            { header: "Transaction ID", key: "transactionId", width: 25 },
            { header: "Recorded By", key: "recordedBy", width: 20 },
            { header: "Status", key: "status", width: 15 },
        ];

        payments.forEach((payment) => {
            worksheet.addRow({
                date: new Date(payment.date).toLocaleString(),
                memberId: payment.memberId?.memberId || "N/A",
                memberName: payment.memberId?.name || "N/A",
                plan: payment.planId?.name || "N/A",
                amount: payment.amount,
                method: payment.paymentMethod.toUpperCase(),
                transactionId: payment.transactionId || "-",
                recordedBy: payment.recordedBy?.name || "System",
                status: payment.status.toUpperCase(),
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();

        // Fix TS conversion using unknown first
        const fileBuffer = Buffer.from(buffer as unknown as ArrayBuffer);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Disposition": `attachment; filename="payments_${new Date().toISOString().split("T")[0]}.xlsx"`,
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to export payments" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
