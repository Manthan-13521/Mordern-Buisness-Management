import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelPayment } from "@/models/HostelPayment";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { requestContext } from "@/lib/requestContext";

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
            let isAuthorized = false;
    let user: AuthUser | null = null;
    try {
            await dbConnect();
            user = await resolveUser(req);
            // SECURITY: Only hostel_admin and superadmin can access hostel backups
            if (user && (user.role === "superadmin" || user.role === "hostel_admin")) {
                isAuthorized = true;
            }

            if (!isAuthorized) {
                return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            // SECURITY: Never fall back to poolId for hostel data
            const hostelId = user?.hostelId;
            if (!hostelId && user?.role !== "superadmin") {
                return NextResponse.json({ error: "Hostel ID missing from session" }, { status: 403 });
            }
            const baseMatch = hostelId ? { hostelId } : {};

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

                    (async () => {
                        try {
                            // Write Members Stream
                            const membersCursor = HostelMember.find({ status: { $ne: "deleted" }, ...baseMatch })
                                .populate("planId", "name")
                                .populate("roomId", "roomNo")
                                .populate("blockId", "name")
                                .populate("floorId", "floorNo")
                                .cursor();

                            for await (const m of membersCursor) {
                                let loc = (m.roomId as any)?.roomNo ? `${(m.roomId as any)?.roomNo}` : "N/A";
                                if ((m.blockId as any)?.name) loc = `${(m.blockId as any)?.name}-${loc}`;
                                membersSheet.addRow({
                                    memberId: m.memberId,
                                    name: m.name,
                                    phone: m.phone,
                                    plan: (m.planId as any)?.name || "N/A",
                                    room: loc,
                                    balance: m.balance || 0,
                                    status: m.status,
                                }).commit();
                            }
                            membersSheet.commit();

                            // Write Payments Stream
                            const paymentsCursor = HostelPayment.find({ ...baseMatch })
                                .populate("memberId", "name memberId")
                                .populate("planId", "name")
                                .cursor();

                            for await (const p of paymentsCursor) {
                                paymentsSheet.addRow({
                                    memberId: (p.memberId as any)?.memberId || "",
                                    memberName: (p.memberId as any)?.name || "",
                                    amount: p.amount,
                                    method: p.paymentMethod,
                                    status: p.status,
                                    date: (p as any).payment_date ? new Date((p as any).payment_date).toLocaleString("en-IN") : new Date(p.createdAt || new Date()).toLocaleString("en-IN"),
                                }).commit();
                            }
                            paymentsSheet.commit();

                            await workbook.commit();
                        } catch (err) {
                            console.error("Export Stream Error:", err);
                            pass.destroy(err as Error);
                        }
                    })();
                }
            });
            
            const dateStrDay = new Date().toISOString().split("T")[0];
            const filename = `hostel_backup_${dateStrDay}.xlsx`;

            return new NextResponse(stream, {
                status: 200,
                headers: {
                    "Content-Disposition": `attachment; filename="${filename}"`,
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                },
            });
        } catch (error) {
            console.error("Excel backup failed", error);
            return NextResponse.json({ error: "Failed to generate Excel backup" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        });
            
}
