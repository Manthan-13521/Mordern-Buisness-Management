import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelBlock } from "@/models/HostelBlock";
import { resolveUser, AuthUser } from "@/lib/authHelper";
export const dynamic = "force-dynamic";

// GET /api/hostel/blocks — return all block names for the authenticated hostel
export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        await dbConnect();

        if (!user || user.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const hostelId = user.hostelId as string;
        if (!hostelId) return NextResponse.json({ error: "Forbidden" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const blocks = await HostelBlock.find({ hostelId })
            .select("name")
            .sort({ name: 1 })
            .lean() as any[];

        return NextResponse.json({ blocks: blocks.map((b) => b.name) }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/hostel/blocks]", error);
        return NextResponse.json({ error: "Failed to fetch blocks" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
