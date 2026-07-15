import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { Member } from "@/models/Member";
import { Plan } from "@/models/Plan";
import { User } from "@/models/User";
import { requestContext } from "@/lib/requestContext";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;


export async function GET(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "GET";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            await dbConnect();

            const user = await resolveUser(req);
            if (!user) return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            const baseMatch = user.role !== "superadmin" && user.poolId ? { poolId: new mongoose.Types.ObjectId(user.poolId) } : {};

            const ExcelJS = (await import("exceljs")).default;
            const { PassThrough } = await import("stream");

            const stream = new ReadableStream({
                start(controller) {
                    const pass = new PassThrough();
                    pass.on("data", (chunk) => {
                        try {
                            controller.enqueue(new Uint8Array(chunk));
                        } catch (err) {
                            pass.destroy();
                        }
                    });
                    pass.on("end", () => {
                        try { controller.close(); } catch (err) {}
                    });
                    pass.on("error", (err) => {
                        try { controller.error(err); } catch (e) {}
                    });

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
                            const paymentsCursor = Payment.aggregate([
                                { $match: baseMatch },
                                { $sort: { date: -1 } },
                                {
                                    $lookup: {
                                        from: "members",
                                        localField: "memberId",
                                        foreignField: "_id",
                                        as: "memberDoc"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "entertainmentmembers",
                                        localField: "memberId",
                                        foreignField: "_id",
                                        as: "entMemberDoc"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "plans",
                                        localField: "planId",
                                        foreignField: "_id",
                                        as: "planDoc"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "users",
                                        localField: "recordedBy",
                                        foreignField: "_id",
                                        as: "recordedByDoc"
                                    }
                                },
                                {
                                    $project: {
                                        date: 1,
                                        amount: 1,
                                        paymentMethod: 1,
                                        transactionId: 1,
                                        status: 1,
                                        memberName: {
                                            $ifNull: [
                                                { $arrayElemAt: ["$memberDoc.name", 0] },
                                                { $arrayElemAt: ["$entMemberDoc.name", 0] },
                                                "N/A"
                                            ]
                                        },
                                        memberIdCode: {
                                            $ifNull: [
                                                { $arrayElemAt: ["$memberDoc.memberId", 0] },
                                                { $arrayElemAt: ["$entMemberDoc.memberId", 0] },
                                                "N/A"
                                            ]
                                        },
                                        planName: {
                                            $ifNull: [
                                                { $arrayElemAt: ["$planDoc.name", 0] },
                                                "N/A"
                                            ]
                                        },
                                        recordedByName: {
                                            $ifNull: [
                                                { $arrayElemAt: ["$recordedByDoc.name", 0] },
                                                "System"
                                            ]
                                        }
                                    }
                                }
                            ]).cursor();

                            for await (const payment of paymentsCursor) {
                                worksheet.addRow({
                                    date: payment.date ? new Date(payment.date).toLocaleString() : "",
                                    memberId: payment.memberIdCode,
                                    memberName: payment.memberName,
                                    plan: payment.planName,
                                    amount: payment.amount,
                                    method: (payment.paymentMethod || "").toUpperCase(),
                                    transactionId: payment.transactionId || "-",
                                    recordedBy: payment.recordedByName,
                                    status: (payment.status || "").toUpperCase(),
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
        });
            
}
