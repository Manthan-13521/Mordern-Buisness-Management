import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
        const skip = (page - 1) * limit;

        const baseMatch = session.user.role !== "superadmin" && session.user.poolId ? { poolId: session.user.poolId } : {};

        const [members, total] = await Promise.all([
            Member.find({ status: "expired", ...baseMatch })
                .populate("planId", "name durationDays durationHours price")
                .sort({ expiryDate: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Member.countDocuments({ status: "expired", ...baseMatch }),
        ]);

        return NextResponse.json({
            members,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch expired members" }, { status: 500 });
    }
}
