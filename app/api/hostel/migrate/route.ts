import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelPlan } from "@/models/HostelPlan";
import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

// POST /api/hostel/migrate
// One-time script to migrate the database schema
export async function POST(req: Request) {
    try {
                const authHeader = req.headers.get("authorization");
        let token = null;

        if (authHeader?.startsWith("Bearer ")) {
            try {
                const bearerToken = authHeader.split(" ")[1];
                const secret = new TextEncoder().encode(process.env.JWT_SECRET);
                const { payload } = await jwtVerify(bearerToken, secret);
                token = payload;
            } catch (e) {}
        }

        if (!token) {
            token = await getToken({ req: req as any });
        }

        await dbConnect();

        if (!token || token.role !== "superadmin") {
            // allowing hostel_admin to trigger it for their own hostel for testing
            if (token?.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        
        await dbConnect();

        // If migrating all hostels, remove hostelId filter. For scope isolation, let's keep it to user's hostel if they are hostel_admin
        const filter: any = {};
        if (token.role === "hostel_admin") {
            filter.hostelId = token.hostelId;
        }

        const members = await HostelMember.find(filter).lean() as any[];
        let migratedCount = 0;

        for (const member of members) {
            // Find existing plan for rent base
            const plan = await HostelPlan.findById(member.planId).lean() as any;
            const fallbackPrice = plan ? plan.price : (member.totalFee || 5000);

            // Legacy mappings -> New properties
            // If already migrated, due_date exists
            if (member.due_date && member.rent_amount) continue;

            const updatePayload: any = {
                $set: {
                    due_date: member.planEndDate || new Date(),
                    rent_amount: fallbackPrice,
                    balance: 0, // Reset as per prompt
                    status: "active"
                },
                $unset: {
                    planEndDate: 1,
                    planStartDate: 1,
                    totalFee: 1,
                    paidAmount: 1,
                    isExpired: 1,
                    expiredAt: 1
                }
            };

            await HostelMember.updateOne({ _id: member._id }, updatePayload);
            migratedCount++;
        }

        return NextResponse.json({ success: true, migratedCount }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[POST /api/hostel/migrate]", error);
        return NextResponse.json({ error: error?.message || "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
