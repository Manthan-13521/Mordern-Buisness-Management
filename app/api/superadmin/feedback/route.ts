import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { dbConnect } from "@/lib/mongodb";
import { Feedback } from "@/models/Feedback";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const [token] = await Promise.all([
            getToken({ req: req as any }),
            dbConnect(),
        ]);

        if (!token || token.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized. Superadmin only." }, { status: 403 });
        }

        const url = new URL(req.url);
        const status = url.searchParams.get("status");
        const type = url.searchParams.get("type");

        let filter: any = {};
        if (status && status !== "all") filter.status = status;
        if (type && type !== "all") filter.type = type;

        const feedbacks = await Feedback.find(filter).sort({ createdAt: -1 });

        return NextResponse.json(feedbacks, { status: 200 });
    } catch (error) {
        console.error("[GET /api/superadmin/feedback]", error);
        return NextResponse.json({ error: "Failed to fetch feedbacks" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const [token, body] = await Promise.all([
            getToken({ req: req as any }),
            req.json(),
            dbConnect(),
        ]);

        if (!token || token.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized. Superadmin only." }, { status: 403 });
        }

        const { _id, status, priority } = body;

        if (!_id) {
            return NextResponse.json({ error: "Feedback ID is required" }, { status: 400 });
        }

        const updateData: any = {};
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;

        const updated = await Feedback.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' });

        if (!updated) {
            return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
        }

        return NextResponse.json(updated, { status: 200 });
    } catch (error) {
        console.error("[PATCH /api/superadmin/feedback]", error);
        return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
    }
}
