import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/export/members
 * Export all members (regular + entertainment) as CSV (Excel-compatible).
 */
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user || !["admin", "superadmin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized: Admins only" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const query: Record<string, unknown> = {};
        if (session.user.role !== "superadmin") {
            query.poolId = session.user.poolId || "UNASSIGNED_POOL";
        }

        const populateFields = "name price";

        const headers = [
            "Member ID",
            "Name",
            "Phone",
            "Age",
            "Plan",
            "Plan Price",
            "Quantity",
            "Paid Amount",
            "Balance",
            "Payment Status",
            "Payment Mode",
            "Type",
            "Status",
            "Valid Till",
            "Created At",
        ];

        const escapeCSV = (val: string) => {
            if (val && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val ?? "";
        };

        const generateRow = (m: any, type: string) => {
            const plan = m.planId as any;
            const endDate = m.planEndDate || m.expiryDate || "";
            const isExpired = m.isExpired || (endDate && new Date(endDate) < new Date());
            const status = m.isDeleted ? "Deleted" : isExpired ? "Expired" : "Active";

            return [
                m.memberId ?? "",
                m.name ?? "",
                m.phone ?? "",
                m.age ?? "",
                plan?.name ?? "N/A",
                plan?.price ?? 0,
                m.planQuantity ?? 1,
                m.paidAmount ?? 0,
                m.balanceAmount ?? 0,
                m.paymentStatus ?? "",
                m.paymentMode ?? "",
                type,
                status,
                endDate ? new Date(endDate).toLocaleDateString("en-IN") : "",
                m.createdAt ? new Date(m.createdAt).toLocaleDateString("en-IN") : "",
            ].map((v: any) => escapeCSV(String(v))).join(",") + "\n";
        };

        const stream = new ReadableStream({
            async start(controller) {
                // Add BOM for Excel UTF-8 support
                controller.enqueue("\ufeff"); 
                controller.enqueue(headers.join(",") + "\n");
                
                // Stream Regular Members
                const memberCursor = Member.find(query).populate("planId", populateFields).sort({ createdAt: -1 }).lean().cursor();
                for await (const doc of memberCursor) {
                    controller.enqueue(generateRow(doc, "Regular"));
                }
                
                // Stream Entertainment Members
                const entertainmentCursor = EntertainmentMember.find(query).populate("planId", populateFields).sort({ createdAt: -1 }).lean().cursor();
                for await (const doc of entertainmentCursor) {
                    controller.enqueue(generateRow(doc, "Entertainment"));
                }

                controller.close();
            }
        });

        return new Response(stream, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="members_export_${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    } catch (error) {
        console.error("[GET /api/export/members]", error);
        return NextResponse.json({ error: "Export failed" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
