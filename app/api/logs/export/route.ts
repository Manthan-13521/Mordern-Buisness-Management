import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { EntryLog } from "@/models/EntryLog";
import { Payment } from "@/models/Payment";
import { Member } from "@/models/Member";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


export async function GET(req: Request) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const filterType = searchParams.get("type") || "all";
        const unifiedLogs: any[] = [];

        const baseMatch = session.user.role !== "superadmin" && session.user.poolId ? { poolId: session.user.poolId } : {};

        // Fetch all log types in parallel
        const [entries, payments, registrations] = await Promise.all([
            filterType === "all" || filterType === "entry"
                ? EntryLog.find({ ...baseMatch }).populate("memberId", "name memberId").sort({ scanTime: -1 }).limit(500).lean()
                : Promise.resolve([]),
            filterType === "all" || filterType === "payment"
                ? Payment.find({ ...baseMatch }).populate("memberId", "name memberId").sort({ date: -1 }).limit(500).lean()
                : Promise.resolve([]),
            filterType === "all" || filterType === "registration"
                ? Member.find({ ...baseMatch }).sort({ createdAt: -1 }).limit(500).lean()
                : Promise.resolve([]),
        ]);

        (entries as any[]).forEach((e: any) => unifiedLogs.push({
            date: e.scanTime, type: "Entry Scan", description: `Entry ${e.status.toUpperCase()} ${e.reason ? `(${e.reason})` : ""}`,
            member: e.memberId?.name || "Unknown", memberId: e.memberId?.memberId || "N/A"
        }));

        (payments as any[]).forEach((p: any) => unifiedLogs.push({
            date: p.date, type: "Payment", description: `₹${p.amount} via ${p.paymentMethod.toUpperCase()} (${p.status})`,
            member: p.memberId?.name || "Unknown", memberId: p.memberId?.memberId || "N/A"
        }));

        (registrations as any[]).forEach((m: any) => unifiedLogs.push({
            date: m.createdAt, type: "Registration", description: "New member registered",
            member: m.name, memberId: m.memberId
        }));

        unifiedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Create Excel
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("System Logs");
        worksheet.columns = [
            { header: "Date & Time", key: "date", width: 25 },
            { header: "Type", key: "type", width: 15 },
            { header: "Member ID", key: "memberId", width: 15 },
            { header: "Member Name", key: "member", width: 25 },
            { header: "Description", key: "description", width: 40 },
        ];

        unifiedLogs.forEach((log) => {
            worksheet.addRow({
                date: new Date(log.date).toLocaleString(),
                type: log.type,
                memberId: log.memberId,
                member: log.member,
                description: log.description,
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const fileBuffer = Buffer.from(buffer as unknown as ArrayBuffer);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Disposition": `attachment; filename="system_logs_${new Date().toISOString().split("T")[0]}.xlsx"`,
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to export logs" }, { status: 500 });
    }
}
