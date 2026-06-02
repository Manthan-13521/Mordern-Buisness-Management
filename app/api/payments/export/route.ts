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

        const [members, entMembers, plans] = await Promise.all([
            Member.find(baseMatch).select("name memberId").lean(),
            import("@/models/EntertainmentMember").then(m => m.EntertainmentMember.find(baseMatch).select("name memberId").lean()),
            import("@/models/Plan").then(m => m.Plan.find(baseMatch).select("name price").lean()),
        ]);

        const memberMap = new Map();
        members.forEach((m: any) => memberMap.set(m._id.toString(), m));
        entMembers.forEach((m: any) => memberMap.set(m._id.toString(), m));
        const planMap = new Map();
        plans.forEach((p: any) => planMap.set(p._id.toString(), p));

        const ExcelJS = (await import("exceljs")).default;
        const { PassThrough } = await import("stream");

        const stream = new ReadableStream({
            start(controller) {
                const pass = new PassThrough();
                pass.on("data", (chunk) => controller.enqueue(new Uint8Array(chunk)));
                pass.on("end", () => controller.close());
                pass.on("error", (err) => controller.error(err));

                const options = {
                    stream: pass,
                    useStyles: false,
                    useSharedStrings: false
                };
                
                const workbook = new ExcelJS.stream.xlsx.WorkbookWriter(options);
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

                (async () => {
                    try {
                        const paymentsCursor = Payment.find(baseMatch)
                            .populate("recordedBy", "name")
                            .sort({ date: -1 })
                            .lean()
                            .cursor();

                        for await (const p of paymentsCursor) {
                            const payment = p as any;
                            const member = memberMap.get(payment.memberId?.toString()) || { name: "N/A", memberId: "Unknown" };
                            const plan = planMap.get(payment.planId?.toString()) || { name: "N/A" };

                            worksheet.addRow({
                                date: new Date(payment.date).toLocaleString(),
                                memberId: member.memberId || "N/A",
                                memberName: member.name || "N/A",
                                plan: plan.name || "N/A",
                                amount: payment.amount,
                                method: payment.paymentMethod.toUpperCase(),
                                transactionId: payment.transactionId || "-",
                                recordedBy: payment.recordedBy?.name || "System",
                                status: payment.status.toUpperCase(),
                            }).commit();
                        }

                        worksheet.commit();
                        await workbook.commit();
                    } catch (err) {
                        console.error("Export Stream Error:", err);
                        pass.destroy(err as Error);
                    }
                })();
            }
        });

        return new NextResponse(stream, {
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
