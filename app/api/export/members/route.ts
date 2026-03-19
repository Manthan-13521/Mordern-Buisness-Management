import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/export/members
 * Export all members (regular + entertainment) as CSV (Excel-compatible).
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();

        const query: Record<string, unknown> = {};
        if (session.user.role !== "superadmin" && session.user.poolId) {
            query.poolId = session.user.poolId;
        }

        const populateFields = "name price";

        const [regularMembers, entertainmentMembers] = await Promise.all([
            Member.find(query).populate("planId", populateFields).sort({ createdAt: -1 }).lean(),
            EntertainmentMember.find(query).populate("planId", populateFields).sort({ createdAt: -1 }).lean(),
        ]);

        const taggedEntertainment = entertainmentMembers.map((m: any) => ({ ...m, _type: "Entertainment" }));
        const taggedRegular = regularMembers.map((m: any) => ({ ...m, _type: "Regular" }));
        const allMembers = [...taggedRegular, ...taggedEntertainment]
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Build CSV
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

        const rows = allMembers.map((m: any) => {
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
                m._type ?? "Regular",
                status,
                endDate ? new Date(endDate).toLocaleDateString("en-IN") : "",
                m.createdAt ? new Date(m.createdAt).toLocaleDateString("en-IN") : "",
            ].map((v: any) => escapeCSV(String(v)));
        });

        const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");

        // Add BOM for Excel to correctly detect UTF-8
        const bom = "\ufeff";
        const csvWithBom = bom + csv;

        return new Response(csvWithBom, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="members_export_${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    } catch (error) {
        console.error("[GET /api/export/members]", error);
        return NextResponse.json({ error: "Export failed" }, { status: 500 });
    }
}
