import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { DemoRequest } from "@/models/DemoRequest";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        await dbConnect();

        if (!user || user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized. Superadmin only." }, { status: 403 });
        }

        const url = new URL(req.url);
        const status = url.searchParams.get("status");

        const filter: any = {};
        if (status && status !== "all") filter.status = status;

        const demos = await DemoRequest.find(filter).sort({ createdAt: -1 });

        return NextResponse.json(demos, { status: 200 });
    } catch (error) {
        console.error("[GET /api/superadmin/demo]", error);
        return NextResponse.json({ error: "Failed to fetch demo requests" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await resolveUser(req);
        const [body] = await Promise.all([req.json(), dbConnect()]);

        if (!user || user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized. Superadmin only." }, { status: 403 });
        }

        const { _id, status } = body;

        if (!_id) {
            return NextResponse.json({ error: "Demo request ID is required" }, { status: 400 });
        }

        const updateData: any = {};
        if (status) updateData.status = status;

        const updated = await DemoRequest.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' });

        if (!updated) {
            return NextResponse.json({ error: "Demo request not found" }, { status: 404 });
        }

        return NextResponse.json(updated, { status: 200 });
    } catch (error) {
        console.error("[PATCH /api/superadmin/demo]", error);
        return NextResponse.json({ error: "Failed to update demo request" }, { status: 500 });
    }
}
