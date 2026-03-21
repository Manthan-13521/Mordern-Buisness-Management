import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { EntryLog } from "@/models/EntryLog";
import ExcelJS from "exceljs";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const poolId = searchParams.get("poolId");
        
        if (!poolId) return NextResponse.json({ error: "Pool ID required for exports" }, { status: 400 });

        await dbConnect();
        
        const logs = await EntryLog.find({ poolId })
            .populate("memberId", "name memberId status")
            .sort({ scanTime: -1 })
            .limit(1000)
            .lean();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Entry Logs");

        worksheet.columns = [
            { header: "Date/Time", key: "time", width: 25 },
            { header: "Member ID", key: "memberId", width: 15 },
            { header: "Name", key: "name", width: 25 },
            { header: "Event", key: "reason", width: 15 },
            { header: "Method", key: "method", width: 15 },
        ];

        logs.forEach((log: any) => {
            worksheet.addRow({
                time: new Date(log.scanTime).toLocaleString(),
                memberId: log.memberId?.memberId || "Unknown",
                name: log.memberId?.name || "Unknown",
                reason: log.reason === "entry_scan" ? "Entry" : "Exit",
                method: log.rawPayload || "QR",
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="attendance-export-${poolId}-${Date.now()}.xlsx"`,
            },
        });
    } catch (e: any) {
         return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
