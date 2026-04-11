import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { BusinessLabour } from "@/models/BusinessLabour";
import { BusinessAttendance } from "@/models/BusinessAttendance";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const businessId = session.user.businessId;

        const labours = await BusinessLabour.aggregate([
            { $match: { businessId, isActive: true } },
            {
                $lookup: {
                    from: "businessattendances",
                    localField: "_id",
                    foreignField: "labourId",
                    as: "recentAttendance",
                    pipeline: [
                        { $sort: { date: -1 } }
                    ]
                }
            },
            {
                $lookup: {
                    from: "businesslabourpayments",
                    localField: "_id",
                    foreignField: "labourId",
                    as: "payments",
                    pipeline: [
                        { $sort: { date: -1 } }
                    ]
                }
            },
            { $sort: { name: 1 } }
        ]);

        return NextResponse.json(labours, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch labour" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, role, salary, phone } = body;

        if (!name || !role || !salary) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await dbConnect();
        const businessId = session.user.businessId;

        const labour = new BusinessLabour({
            name,
            role,
            salary,
            phone,
            businessId,
            isActive: true
        });

        await labour.save();
        return NextResponse.json(labour, {
            status: 201,
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create labour" }, { status: 500 });
    }
}
